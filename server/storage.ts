import type { 
  User, InsertUser,
  Motoboy, InsertMotoboy,
  Client, InsertClient,
  Order, InsertOrder,
  LiveDoc, InsertLiveDoc,
  ChatMessage, InsertChatMessage,
  MotoboySchedule, InsertMotoboySchedule,
  ClientSchedule, InsertClientSchedule
} from "@shared/schema";
import { 
  users, 
  motoboys, 
  clients, 
  orders, 
  liveDocs, 
  chatMessages, 
  motoboySchedules, 
  clientSchedules 
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";
import { db } from "./db.js";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<void>;
  
  getAllMotoboys(): Promise<Motoboy[]>;
  getMotoboy(id: string): Promise<Motoboy | undefined>;
  createMotoboy(motoboy: InsertMotoboy): Promise<Motoboy>;
  updateMotoboy(id: string, data: Partial<Motoboy>): Promise<void>;
  updateMotoboyLocation(id: string, lat: string, lng: string): Promise<void>;
  setMotoboyOnline(id: string, online: boolean): Promise<void>;
  
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByClient(clientId: string): Promise<Order[]>;
  getOrdersByMotoboy(motoboyId: string): Promise<Order[]>;
  getPendingOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<void>;
  assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string): Promise<void>;
  
  getLiveDocsByOrder(orderId: string): Promise<LiveDoc[]>;
  createLiveDoc(doc: InsertLiveDoc): Promise<LiveDoc>;
  
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  getMotoboySchedule(motoboyId: string): Promise<MotoboySchedule[]>;
  saveMotoboySchedule(schedule: InsertMotoboySchedule): Promise<MotoboySchedule>;
  
  getClientSchedule(clientId: string): Promise<ClientSchedule[]>;
  saveClientSchedule(schedule: InsertClientSchedule): Promise<ClientSchedule>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private motoboys: Map<string, Motoboy>;
  private clients: Map<string, Client>;
  private orders: Map<string, Order>;
  private liveDocs: Map<string, LiveDoc>;
  private chatMessages: ChatMessage[];
  private motoboySchedules: Map<string, MotoboySchedule>;
  private clientSchedules: Map<string, ClientSchedule>;

  constructor() {
    this.users = new Map();
    this.motoboys = new Map();
    this.clients = new Map();
    this.orders = new Map();
    this.liveDocs = new Map();
    this.chatMessages = [];
    this.motoboySchedules = new Map();
    this.clientSchedules = new Map();
    
    this.seedData();
  }

  private async seedData() {
    const centralUser: User = {
      id: 'central_01',
      name: 'Admin Central',
      role: 'central',
      phone: '27999999999' as string | null,
      email: 'central@guriri.com' as string | null,
      password: await bcrypt.hash('123456', 10),
      status: 'active',
      createdAt: new Date(),
    };
    this.users.set(centralUser.id, centralUser);

    for (let i = 1; i <= 3; i++) {
      const motoboy: Motoboy = {
        id: `motoboy_0${i}`,
        name: `Motoboy ${i}`,
        phone: `2799999000${i}`,
        placa: `ABC-${i}D${i}${i}`,
        cpf: `000.000.000-0${i}`,
        taxaPadrao: "7.00",
        status: 'ativo',
        online: i === 1,
        currentLat: i === 1 ? "-19.0200" : null,
        currentLng: i === 1 ? "-40.0200" : null,
        createdAt: new Date(),
      };
      this.motoboys.set(motoboy.id, motoboy);

      const motoboyUser: User = {
        id: motoboy.id,
        name: motoboy.name,
        role: 'motoboy',
        phone: motoboy.phone as string | null,
        email: null as string | null,
        password: await bcrypt.hash('123456', 10),
        status: 'active',
        createdAt: new Date(),
      };
      this.users.set(motoboyUser.id, motoboyUser);
    }

    const client: Client = {
      id: 'cliente_01',
      name: 'Empresa Teste',
      phone: '27988888888',
      email: 'empresa@teste.com',
      company: 'Teste Ltda',
      createdAt: new Date(),
    };
    this.clients.set(client.id, client);

    const clientUser: User = {
      id: client.id,
      name: client.name,
      role: 'client',
      phone: client.phone as string | null,
      email: client.email as string | null,
      password: await bcrypt.hash('123456', 10),
      status: 'active',
      createdAt: new Date(),
    };
    this.users.set(clientUser.id, clientUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === role);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = { 
      ...insertUser, 
      password: hashedPassword,
      createdAt: new Date() 
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.status = status;
    }
  }

  async getAllMotoboys(): Promise<Motoboy[]> {
    return Array.from(this.motoboys.values());
  }

  async getMotoboy(id: string): Promise<Motoboy | undefined> {
    return this.motoboys.get(id);
  }

  async createMotoboy(insertMotoboy: InsertMotoboy): Promise<Motoboy> {
    const id = randomUUID();
    const motoboy: Motoboy = { 
      ...insertMotoboy,
      phone: insertMotoboy.phone || null,
      placa: insertMotoboy.placa || null,
      cpf: insertMotoboy.cpf || null,
      id,
      online: null,
      currentLat: null,
      currentLng: null,
      createdAt: new Date() 
    };
    this.motoboys.set(id, motoboy);
    return motoboy;
  }

  async updateMotoboy(id: string, data: Partial<Motoboy>): Promise<void> {
    const motoboy = this.motoboys.get(id);
    if (motoboy) {
      Object.assign(motoboy, data);
    }
  }

  async updateMotoboyLocation(id: string, lat: string, lng: string): Promise<void> {
    const motoboy = this.motoboys.get(id);
    if (motoboy) {
      motoboy.currentLat = lat;
      motoboy.currentLng = lng;
    }
  }

  async setMotoboyOnline(id: string, online: boolean): Promise<void> {
    const motoboy = this.motoboys.get(id);
    if (motoboy) {
      motoboy.online = online;
    }
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const client: Client = { 
      ...insertClient,
      email: insertClient.email || null,
      company: insertClient.company || null,
      createdAt: new Date() 
    };
    this.clients.set(client.id, client);
    return client;
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getOrdersByMotoboy(motoboyId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.motoboyId === motoboyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPendingOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.status === 'pending')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder,
      coletaComplemento: insertOrder.coletaComplemento || null,
      entregaComplemento: insertOrder.entregaComplemento || null,
      referencia: insertOrder.referencia || null,
      observacoes: insertOrder.observacoes || null,
      trocoValor: insertOrder.trocoValor || null,
      id,
      status: 'pending',
      motoboyId: null,
      motoboyName: null,
      createdAt: new Date(),
      acceptedAt: null,
      deliveredAt: null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      if (status === 'delivered') {
        order.deliveredAt = new Date();
      }
    }
  }

  async assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (order) {
      order.motoboyId = motoboyId;
      order.motoboyName = motoboyName;
      order.status = 'in_progress';
      order.acceptedAt = new Date();
    }
  }

  async getLiveDocsByOrder(orderId: string): Promise<LiveDoc[]> {
    return Array.from(this.liveDocs.values())
      .filter(d => d.orderId === orderId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async createLiveDoc(insertDoc: InsertLiveDoc): Promise<LiveDoc> {
    const id = randomUUID();
    const doc: LiveDoc = { 
      ...insertDoc,
      gpsLat: insertDoc.gpsLat || null,
      gpsLng: insertDoc.gpsLng || null,
      id,
      uploadedAt: new Date() 
    };
    this.liveDocs.set(id, doc);
    return doc;
  }

  async getChatMessages(limit: number = 100): Promise<ChatMessage[]> {
    return this.chatMessages
      .slice(-limit)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = { 
      ...insertMessage,
      toId: insertMessage.toId || null,
      orderId: insertMessage.orderId || null,
      id,
      createdAt: new Date() 
    };
    this.chatMessages.push(message);
    return message;
  }

  async getMotoboySchedule(motoboyId: string): Promise<MotoboySchedule[]> {
    return Array.from(this.motoboySchedules.values())
      .filter(s => s.motoboyId === motoboyId);
  }

  async saveMotoboySchedule(insertSchedule: InsertMotoboySchedule): Promise<MotoboySchedule> {
    const id = randomUUID();
    const schedule: MotoboySchedule = { 
      ...insertSchedule,
      turnoManha: insertSchedule.turnoManha ?? null,
      turnoTarde: insertSchedule.turnoTarde ?? null,
      turnoNoite: insertSchedule.turnoNoite ?? null,
      id 
    };
    this.motoboySchedules.set(id, schedule);
    return schedule;
  }

  async getClientSchedule(clientId: string): Promise<ClientSchedule[]> {
    return Array.from(this.clientSchedules.values())
      .filter(s => s.clientId === clientId);
  }

  async saveClientSchedule(insertSchedule: InsertClientSchedule): Promise<ClientSchedule> {
    const id = randomUUID();
    const schedule: ClientSchedule = { 
      ...insertSchedule,
      horaAbertura: insertSchedule.horaAbertura || null,
      horaFechamento: insertSchedule.horaFechamento || null,
      fechado: insertSchedule.fechado ?? null,
      id 
    };
    this.clientSchedules.set(id, schedule);
    return schedule;
  }
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const result = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    await db.update(users).set({ status }).where(eq(users.id, id));
  }

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

  async updateMotoboyLocation(id: string, lat: string, lng: string): Promise<void> {
    await db.update(motoboys).set({ 
      currentLat: lat,
      currentLng: lng 
    }).where(eq(motoboys.id, id));
  }

  async setMotoboyOnline(id: string, online: boolean): Promise<void> {
    await db.update(motoboys).set({ online }).where(eq(motoboys.id, id));
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.clientId, clientId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByMotoboy(motoboyId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.motoboyId, motoboyId))
      .orderBy(desc(orders.createdAt));
  }

  async getPendingOrders(): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.status, 'pending'))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values({
      ...insertOrder,
      status: 'pending',
    }).returning();
    return result[0];
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    const updateData: any = { status };
    if (status === 'delivered') {
      updateData.deliveredAt = drizzleSql`NOW()`;
    }
    await db.update(orders).set(updateData).where(eq(orders.id, id));
  }

  async assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string): Promise<void> {
    await db.update(orders).set({
      motoboyId,
      motoboyName,
      status: 'in_progress',
      acceptedAt: drizzleSql`NOW()`,
    }).where(eq(orders.id, orderId));
  }

  async getLiveDocsByOrder(orderId: string): Promise<LiveDoc[]> {
    return await db.select().from(liveDocs)
      .where(eq(liveDocs.orderId, orderId))
      .orderBy(desc(liveDocs.uploadedAt));
  }

  async createLiveDoc(insertDoc: InsertLiveDoc): Promise<LiveDoc> {
    const result = await db.insert(liveDocs).values(insertDoc).returning();
    return result[0];
  }

  async getChatMessages(limit: number = 100): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(insertMessage).returning();
    return result[0];
  }

  async getMotoboySchedule(motoboyId: string): Promise<MotoboySchedule[]> {
    return await db.select().from(motoboySchedules)
      .where(eq(motoboySchedules.motoboyId, motoboyId));
  }

  async saveMotoboySchedule(insertSchedule: InsertMotoboySchedule): Promise<MotoboySchedule> {
    const result = await db.insert(motoboySchedules).values(insertSchedule).returning();
    return result[0];
  }

  async getClientSchedule(clientId: string): Promise<ClientSchedule[]> {
    return await db.select().from(clientSchedules)
      .where(eq(clientSchedules.clientId, clientId));
  }

  async saveClientSchedule(insertSchedule: InsertClientSchedule): Promise<ClientSchedule> {
    const result = await db.insert(clientSchedules).values(insertSchedule).returning();
    return result[0];
  }
}

function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    if (!db) {
      throw new Error('DATABASE_URL is set but database connection failed');
    }
    console.log('✓ Using PostgreSQL database storage');
    return new DbStorage();
  } else {
    console.log('✓ Using in-memory storage');
    return new MemStorage();
  }
}

export const storage = createStorage();
