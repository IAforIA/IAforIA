
import { db } from "../db";
import { orders } from "@shared/schema";
import { desc } from "drizzle-orm";

async function listOrders() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  console.log("--- ORDERS ---");
  allOrders.forEach(o => {
    console.log(`ID: ${o.id} | Status: ${o.status} | ProofURL: ${o.proofUrl}`);
  });
  process.exit(0);
}

listOrders().catch(console.error);
