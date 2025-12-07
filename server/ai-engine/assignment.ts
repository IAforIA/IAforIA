import type { Motoboy, MotoboyLocation, Order } from "@shared/schema";
import { storage } from "../storage.js";
import { calculateDistance, parseDecimal } from "./helpers.js";
import type { OrderWithLatLng, DistanceResult } from "./types.js";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function getCurrentShift(now: Date) {
  const hour = now.getHours();
  if (hour >= 6 && hour < 12) return "turnoManha" as const;
  if (hour >= 12 && hour < 18) return "turnoTarde" as const;
  return "turnoNoite" as const;
}

export async function assignBestMotoboy(
  order: Order,
  availableMotoboys: Motoboy[],
  currentLocations: Map<string, MotoboyLocation>
): Promise<string | null> {
  if (availableMotoboys.length === 0) return null;

  const now = new Date();
  const currentDay = now.getDay();
  const currentShift = getCurrentShift(now);

  const schedules = await Promise.all(
    availableMotoboys.map((motoboy) => storage.getMotoboySchedules(motoboy.id))
  );

  const availableNow = availableMotoboys.filter((motoboy, index) => {
    const schedule = schedules[index].find((s) => s.diaSemana === currentDay);
    if (!schedule) return false;
    return schedule[currentShift] === true;
  });

  if (availableNow.length === 0) {
    console.log(`[AI-Engine] Nenhum motoboy disponível para ${DAYS[currentDay]} ${currentShift}`);
    return null;
  }

  console.log(`[AI-Engine] ${availableNow.length}/${availableMotoboys.length} motoboys disponíveis agora`);

  const orderWithGeo = order as OrderWithLatLng;
  const orderLat = parseDecimal(orderWithGeo.coletaLat) ?? -19.0;
  const orderLng = parseDecimal(orderWithGeo.coletaLng) ?? -40.0;

  const scores: DistanceResult[] = availableNow.map((motoboy) => {
    const location = currentLocations.get(motoboy.id);
    if (!location) return { motoboyId: motoboy.id, distance: Infinity, score: -Infinity };

    const motoboyLat = parseDecimal(location.latitude);
    const motoboyLng = parseDecimal(location.longitude);
    if (motoboyLat === null || motoboyLng === null) {
      return { motoboyId: motoboy.id, distance: Infinity, score: -Infinity };
    }

    const distance = calculateDistance(orderLat, orderLng, motoboyLat, motoboyLng);
    let score = 100 - distance * 10;
    if (motoboy.online) score += 20;

    return { motoboyId: motoboy.id, distance, score };
  });

  const validScores = scores.filter((s) => s.score > -Infinity);
  if (validScores.length === 0) return null;

  validScores.sort((a, b) => b.score - a.score);
  return validScores[0]?.motoboyId ?? null;
}
