import 'dotenv/config';
import { db } from './server/db';
import { users, motoboys, clients } from './shared/schema';

async function gerarCredenciais() {
  console.log('\n========================================');
  console.log('CREDENCIAIS COMPLETAS - GURIRI EXPRESS');
  console.log('========================================\n');

  console.log('ADMINISTRADOR (CENTRAL)');
  console.log('-------------------------------------');
  console.log('Email: admin@guriri.com');
  console.log('Senha: Cristiano123');
  console.log('URL: https://www.guririexpress.com.br/central');
  console.log('\n');

  console.log('MOTOBOYS (ENTREGADORES)');
  console.log('-------------------------------------');
  const motoboysList = await db.select().from(motoboys);
  
  if (motoboysList.length === 0) {
    console.log('Nenhum motoboy cadastrado.');
  } else {
    motoboysList.forEach((motoboy, index) => {
      console.log(`${index + 1}. ${motoboy.name}`);
      console.log(`   Telefone: ${motoboy.phone || 'Nao informado'}`);
      console.log(`   Email: ${motoboy.name.toLowerCase().replace(/\s+/g, '')}@guriri.com`);
      console.log(`   Senha: motoboy123`);
      console.log(`   Placa: ${motoboy.placa || 'Nao informada'}`);
      console.log(`   Status: ${motoboy.status}`);
      console.log('');
    });
  }
  console.log(`Total de motoboys: ${motoboysList.length}`);
  console.log('URL: https://www.guririexpress.com.br/driver');
  console.log('\n');

  console.log('CLIENTES CORPORATIVOS');
  console.log('-------------------------------------');
  const clientsList = await db.select().from(clients);
  
  if (clientsList.length === 0) {
    console.log('Nenhum cliente cadastrado.');
  } else {
    clientsList.forEach((client, index) => {
      const email = client.email || `${client.name.toLowerCase().replace(/\s+/g, '')}@cliente.com`;
      console.log(`${index + 1}. ${client.name}`);
      console.log(`   Telefone: ${client.phone || 'Nao informado'}`);
      console.log(`   Email: ${email}`);
      console.log(`   Senha: cliente123`);
      if (client.endereco) {
        console.log(`   Endereco: ${client.endereco}`);
      }
      console.log('');
    });
  }
  console.log(`Total de clientes: ${clientsList.length}`);
  console.log('URL: https://www.guririexpress.com.br/client');
  console.log('\n');

  console.log('========================================');
  console.log('RESUMO');
  console.log('========================================');
  console.log(`Total de usuarios: ${1 + motoboysList.length + clientsList.length}`);
  console.log(`- Admin: 1`);
  console.log(`- Motoboys: ${motoboysList.length}`);
  console.log(`- Clientes: ${clientsList.length}`);
  console.log('\n');
  console.log('IMPORTANTE:');
  console.log('- Todos os usuarios devem alterar suas senhas no primeiro acesso');
  console.log('- As senhas padrao sao temporarias');
  console.log('- Envie estas credenciais via WhatsApp ou canal seguro');
  console.log('\n');

  process.exit(0);
}

gerarCredenciais().catch((error) => {
  console.error('Erro ao gerar credenciais:', error);
  process.exit(1);
});
