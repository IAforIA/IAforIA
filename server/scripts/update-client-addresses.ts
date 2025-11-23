import { db } from '../db';
import { clients } from '@shared/schema';
import { eq } from 'drizzle-orm';

const clientAddresses = [
  { name: "PARACAI", endereco: "Rua Albino Negris, 273", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-045" },
  { name: "GURIFARMA", endereco: "Rodovia Othovarino Duarte Santos, 1037", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-060" },
  { name: "DROGARIA GURIRI", endereco: "Rodovia Othovarino Duarte Santos, 1883, Loja 04", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-690" },
  { name: "DROGARIA LUA E SOL", endereco: "Av. Gov. Eurico Vieira de Rezende, 62", bairro: "Guriri", cidade: "São Mateus", estado: "ES", cep: "29946-390" },
  { name: "POP FARMA", endereco: "Rodovia Othovarino Duarte Santos, 284", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-035" },
  { name: "BAU DO TESOURO", endereco: "Rodovia Othovarino Duarte Santos, 1637, Loja 3", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-690" },
  { name: "AVELAR SALGADOS", endereco: "Rua Barra de São Francisco, 1749", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-600" },
  { name: "PLANET ROCK", endereco: "Av. Esbertalina Barbosa Damiani, 282-A, Loja 1-2", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-490" },
  { name: "CASA JAMILA", endereco: "Rua Rogério Campista Correia, 361-N", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-350" },
  { name: "PETISCOS", endereco: "Avenida Guriri, 82", bairro: "Guriri", cidade: "São Mateus", estado: "ES", cep: "29946-100" },
  { name: "TAKEDA SUSHI", endereco: "Av. Homero Zordan, 117", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-380" },
  { name: "OISHI SUSHI", endereco: "Av. Esbertalina Barbosa Damiani, 146", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-490" },
  { name: "POINT MILK SHAKE", endereco: "Av. Esbertalina Barbosa Damiani, 245", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-490" },
  { name: "MIZA CHURRASCARIA", endereco: "Avenida Oceano Atlântico, 1501", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-490" },
  { name: "SAMPAIO", endereco: "Av. Esbertalina Barbosa Damiani, 570", bairro: "Guriri Norte", cidade: "São Mateus", estado: "ES", cep: "29946-490" },
  { name: "OLIVA MASSAS", endereco: "Av. Oceano Atlântico, 1060", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-480" },
  { name: "SAARA", endereco: "Av. Oceano Atlântico, 920", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-480" },
  { name: "FARMÁCIA INDIANA", endereco: "Av. Gov. Eurico Vieira de Rezende, 263 - Lotes 01 e 02", bairro: "Guriri Sul", cidade: "São Mateus", estado: "ES", cep: "29945-060" },
  { name: "SÓ SALADA", endereco: "Av. Oceano Índico", bairro: "Guriri", cidade: "São Mateus", estado: "ES", cep: "29945-570" },
  { name: "BASE 10 PLUS", endereco: "", bairro: "", cidade: "São Mateus", estado: "ES", cep: "" },
];

async function updateClientAddresses() {
  console.log('🔄 Atualizando endereços dos clientes...');
  
  for (const clientData of clientAddresses) {
    try {
      // Busca o cliente pelo nome
      const [client] = await db.select().from(clients).where(eq(clients.name, clientData.name));
      
      if (client) {
        // Atualiza o endereço
        await db.update(clients)
          .set({
            endereco: clientData.endereco,
            bairro: clientData.bairro,
            cidade: clientData.cidade,
            estado: clientData.estado,
            cep: clientData.cep,
          })
          .where(eq(clients.id, client.id));
        
        console.log(`✅ ${clientData.name} - Endereço atualizado`);
      } else {
        console.log(`⚠️  ${clientData.name} - Cliente não encontrado`);
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${clientData.name}:`, error);
    }
  }
  
  console.log('✅ Atualização concluída!');
  process.exit(0);
}

updateClientAddresses();
