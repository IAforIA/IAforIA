import type { Order } from "@shared/schema";

export type OrderWithLatLng = Order & {
  coletaLat?: string | null;
  coletaLng?: string | null;
};

export interface DistanceResult {
  motoboyId: string;
  distance: number;
  score: number;
}
