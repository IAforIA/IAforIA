import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc } from 'drizzle-orm';
import {
  users,
  motoboys,
  motoboyLocations,
  clients,
  orders,
  liveDocs,
  chatMessages,
  type InsertOrder,
  type InsertMotoboy,
  type InsertChatMessage,
  type Motoboy
} from '@shared/schema';

// Importa o schema completo para o Drizzle
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema });

// Interface para a classe Storage
// (Mantida igual ao seu arquivo original, se houver)

class DrizzleStorage /* implements IStorage */ {
  // --- Métodos de Usuário ---
  async getUser(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  // CORREÇÃO: Adicionada a nova função para buscar por email
  async getUserByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }


  // --- Métodos de Localização ---
  async updateMotoboyLocation(id: string, lat: number, lng: number) {
    const newLocation = {
      motoboyId: id,
      latitude: lat.toString(),
      longitude: lng.toString()
    };
    await db.insert(motoboyLocations).values(newLocation);
  }

  async getLatestMotoboyLocations() {
    const allLocations = await db.select().from(motoboyLocations).orderBy(desc(motoboyLocations.timestamp));
    const latestByMotoboy = new Map();
    for (const location of allLocations) {
      if (!latestByMotoboy.has(location.motoboyId)) {
        const normalizedLocation = {
          ...location,
          latitude: typeof location.latitude === "string" ? parseFloat(location.latitude) : (location.latitude || 0),
          longitude: typeof location.longitude === "string" ? parseFloat(location.longitude) : (location.longitude || 0)
        };
        latestByMotoboy.set(location.motoboyId, normalizedLocation);
      }
    }
    return latestByMotoboy;
  }

  // --- Métodos de Motoboy ---
  async getAllMotoboys() {
    return await db.select().from(motoboys);
  }

  async getMotoboy(id: string) {
    const result = await db.select().from(motoboys).where(eq(motoboys.id, id)).limit(1);
    return result[0];
  }

  async createMotoboy(insertMotoboy: InsertMotoboy) {
    const result = await db.insert(motoboys).values(insertMotoboy).returning();
    return result[0];
  }

  async updateMotoboy(id: string, data: Partial<Motoboy>) {
    await db.update(motoboys).set(data).where(eq(motoboys.id, id));
  }

  async setMotoboyOnline(id: string, online: boolean) {
    await db.update(motoboys).set({ online }).where(eq(motoboys.id, id));
  }

  // --- Métodos de Pedidos ---
  async getAllOrders() {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string) {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async getPendingOrders() {
    return await db.select().from(orders).where(eq(orders.status, "pending"));
  }

  async createOrder(order: InsertOrder) {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async updateOrderStatus(id: string, status: "pending" | "in_progress" | "delivered" | "cancelled") {
    await db.update(orders).set({ status, deliveredAt: new Date() }).where(eq(orders.id, id));
  }

  async assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string) {
    await db.update(orders).set({
      motoboyId,
      motoboyName,
      status: "in_progress",
      acceptedAt: new Date()
    }).where(eq(orders.id, orderId));
  }

  // --- Métodos de Chat ---
  async getChatMessages(limit?: number) {
    const query = db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt));
    if (limit) query.limit(limit);
    return await query;
  }

  async createChatMessage(message: InsertChatMessage) {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }
}

export const storage = new DrizzleStorage();