import { desc, eq } from 'drizzle-orm';
import { db } from './db.js';
import { orders, type InsertOrder } from '@shared/schema';

export async function getAllOrders() {
  return await db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrder(id: string) {
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getPendingOrders() {
  return await db.select().from(orders).where(eq(orders.status, 'pending'));
}

export async function createOrder(order: InsertOrder) {
  const result = await db.insert(orders).values(order).returning();
  return result[0];
}

export async function updateOrderStatus(
  id: string,
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled',
  proofUrl?: string,
) {
  const updateData: any = { status };
  updateData.deliveredAt = status === 'delivered' ? new Date() : null;
  if (proofUrl) updateData.proofUrl = proofUrl;
  await db.update(orders).set(updateData).where(eq(orders.id, id));
}

export async function assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string) {
  await db
    .update(orders)
    .set({
      motoboyId,
      motoboyName,
      status: 'in_progress',
      acceptedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

export async function getOrdersByClientId(clientId: string) {
  return await db.select().from(orders).where(eq(orders.clientId, clientId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersByMotoboyId(motoboyId: string) {
  return await db.select().from(orders).where(eq(orders.motoboyId, motoboyId)).orderBy(desc(orders.createdAt));
}
