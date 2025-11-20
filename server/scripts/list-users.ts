
import { db } from "../db";
import { users } from "@shared/schema";

async function listUsers() {
  const allUsers = await db.select().from(users);
  console.log("--- USERS ---");
  allUsers.forEach(u => {
    console.log(`ID: ${u.id} | Username: ${u.username} | Role: ${u.role} | Name: ${u.name}`);
  });
  process.exit(0);
}

listUsers().catch(console.error);
