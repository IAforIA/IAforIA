import 'dotenv/config';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

async function resetAllPasswords() {
  console.log('\n=== RESETANDO SENHAS ===\n');
  
  // Hash das senhas padrao
  const motoboyHash = await bcryptjs.hash('motoboy123', 10);
  const clientHash = await bcryptjs.hash('cliente123', 10);
  
  // Buscar todos os usuarios
  const allUsers = await db.select().from(users);
  
  let motoboyCount = 0;
  let clientCount = 0;
  
  // Resetar senha de cada usuario conforme sua role
  for (const user of allUsers) {
    if (user.role === 'motoboy') {
      await db.update(users)
        .set({ password: motoboyHash })
        .where(eq(users.id, user.id));
      console.log(`Motoboy: ${user.email} - senha resetada para motoboy123`);
      motoboyCount++;
    } else if (user.role === 'client') {
      await db.update(users)
        .set({ password: clientHash })
        .where(eq(users.id, user.id));
      console.log(`Cliente: ${user.email} - senha resetada para cliente123`);
      clientCount++;
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Motoboys atualizados: ${motoboyCount}`);
  console.log(`Clientes atualizados: ${clientCount}`);
  console.log(`\nAdmin mantem senha: Cristiano123`);
  
  process.exit(0);
}

resetAllPasswords();
