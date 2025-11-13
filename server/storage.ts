// server/storage.ts

import type { 
  User, InsertUser, Motoboy, InsertMotoboy, Client, InsertClient,
  Order, InsertOrder, LiveDoc, InsertLiveDoc, ChatMessage, InsertChatMessage,
  MotoboySchedule, InsertMotoboySchedule, ClientSchedule, InsertClientSchedule,
  MotoboyLocation, InsertMotoboyLocation 
} from "@shared/schema";
import { 
  users, motoboys, clients, orders, liveDocs, chatMessages, 
  motoboySchedules, clientSchedules, motoboyLocations 
} from "@shared/schema";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";
import { db } from "./db.js";

// A interface IStorage reflete a mudança para usar 'number' para lat/lng
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  // Métodos de motoboys
  getAllMotoboys(): Promise<Motoboy[]>;
  getMotoboy(id: string): Promise<Motoboy | undefined>;
  createMotoboy(motoboy: InsertMotoboy): Promise<Motoboy>;
  updateMotoboy(id: string, data: Partial<Motoboy>): Promise<void>;
  updateMotoboyLocation(id: string, lat: number, lng: number): Promise<void>; // Usa number
  setMotoboyOnline(id: string, online: boolean): Promise<void>;
  // Novo método para buscar a localização mais recente (para uso no AI Engine)
  getLatestMotoboyLocations(): Promise<Map<string, MotoboyLocation>>;
  // Métodos de clientes, pedidos, chat, etc.
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getPendingOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<void>;
  assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string): Promise<void>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

class DrizzleStorage implements IStorage {

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0]; // Retorna o primeiro resultado ou undefined
  }

  // --- Implementação da nova função de localização ---
  async updateMotoboyLocation(id: string, lat: number, lng: number): Promise<void> {
    const newLocation: InsertMotoboyLocation = {
        motoboyId: id,
        latitude: lat.toString(), // Converter number para string para o schema decimal
        longitude: lng.toString(),
    };
    await db.insert(motoboyLocations).values(newLocation);
    // Em produção, você também atualizaria um cache (ex: Redis) aqui para acesso rápido.
  }

  async getLatestMotoboyLocations(): Promise<Map<string, MotoboyLocation>> {
    const allLocations = await db
      .select()
      .from(motoboyLocations)
      .orderBy(desc(motoboyLocations.timestamp));
    
    const latestByMotoboy = new Map<string, MotoboyLocation>();
    
    for (const location of allLocations) {
      if (!latestByMotoboy.has(location.motoboyId)) {
        // Convert decimal strings to numbers for latitude and longitude
        const normalizedLocation = {
          ...location,
          latitude: typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude,
          longitude: typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude,
        } as any;
        latestByMotoboy.set(location.motoboyId, normalizedLocation);
      }
    }
    
    return latestByMotoboy;
  }

  // --- Outros métodos (Exemplos rápidos de como implementar no Drizzle ORM) ---

  async getAllMotoboys(): Promise<Motoboy[]> {
      return await db.select().from(motoboys);
  }

  async getMotoboy(id: string): Promise<Motoboy | undefined> {
    const result = await db.select().from(motoboys).where(eq(motoboys.id, id)).limit(1);
    return result[0];
  }

  async createMotoboy(insertMotoboy: InsertMotoboy): Promise<Motoboy> {
      const result = await db.insert(motoboys).values(insertMotoboy).returning();
      return result[0];
  }

  async updateMotoboy(id: string, data: Partial<Motoboy>): Promise<void> {
    await db.update(motoboys).set(data).where(eq(motoboys.id, id));
  }

  async setMotoboyOnline(id: string, online: boolean): Promise<void> {
    await db.update(motoboys).set({ online }).where(eq(motoboys.id, id));
  }

  // --- Métodos de Pedidos (Apenas exemplos iniciais) ---

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async getPendingOrders(): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.status, 'pending'));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await db.update(orders).set({ status, deliveredAt: new Date() }).where(eq(orders.id, id));
  }

  async assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string): Promise<void> {
    await db.update(orders).set({ 
      motoboyId, 
      motoboyName, 
      status: 'in_progress',
      acceptedAt: new Date()
    }).where(eq(orders.id, orderId));
  }

  // --- Métodos de Chat ---
  async getChatMessages(limit?: number): Promise<ChatMessage[]> {
    const query = db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt));
    if (limit) query.limit(limit);
    return await query;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }
}

// Exporta a instância de armazenamento real
export const storage = new DrizzleStorage();
