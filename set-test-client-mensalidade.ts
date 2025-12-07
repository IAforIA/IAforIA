import 'dotenv/config';
import { db } from './server/db';
import { clients } from './shared/schema';
import { eq } from 'drizzle-orm';

async function setTestClientMensalidade() {
  console.log('\n=== ATUALIZANDO MENSALIDADE DO CLIENTE TESTE ===\n');
  
  // Atualizar mensalidade do cliente de teste para 100 reais
  const result = await db.update(clients)
    .set({ mensalidade: "100.00" })
    .where(eq(clients.id, 'client'))
    .returning();
  
  if (result.length > 0) {
    console.log('✅ Mensalidade atualizada com sucesso!');
    console.log('Cliente:', result[0].name);
    console.log('Mensalidade:', result[0].mensalidade);
    console.log('\nAgora o cliente de teste vera a opcao de R$ 7,00 no formulario de pedido.');
  } else {
    console.log('❌ Cliente de teste nao encontrado');
  }
  
  process.exit(0);
}

setTestClientMensalidade().catch((error) => {
  console.error('Erro:', error);
  process.exit(1);
});
