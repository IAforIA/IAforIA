/**
 * SCRIPT: import-client-addresses.ts
 * PROPÓSITO: Atualizar endereços reais dos clientes no banco Neon
 * USO: npm run import:addresses
 */

import { db } from '../db';
import { clients } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Dados reais dos endereços dos clientes
const CLIENT_ADDRESSES = [
  {
    name: "PARACAI",
    address: {
      rua: "Rua Albino Negris",
      numero: "273",
      bairro: "Guriri Norte",
      cep: "29946-045",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "GURIFARMA",
    address: {
      rua: "Rodovia Othovarino Duarte Santos",
      numero: "1037",
      bairro: "Guriri Sul",
      cep: "29945-060",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "DROGARIA GURIRI",
    address: {
      rua: "Rodovia Othovarino Duarte Santos",
      numero: "1883",
      bairro: "Guriri Sul",
      cep: "29945-690",
      complemento: "Loja 04",
      referencia: "",
    }
  },
  {
    name: "DROGARIA LUA E SOL",
    address: {
      rua: "Av. Gov. Eurico Vieira de Rezende",
      numero: "62",
      bairro: "Guriri",
      cep: "29946-390",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "POP FARMA",
    address: {
      rua: "Rodovia Othovarino Duarte Santos",
      numero: "284",
      bairro: "Guriri Norte",
      cep: "29946-035",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "BAU DO TESOURO",
    address: {
      rua: "Rodovia Othovarino Duarte Santos",
      numero: "1637",
      bairro: "Guriri Sul",
      cep: "29945-690",
      complemento: "Loja 3",
      referencia: "",
    }
  },
  {
    name: "AVELAR SALGADOS",
    address: {
      rua: "Rua Barra de São Francisco",
      numero: "1749",
      bairro: "Guriri Sul",
      cep: "29945-600",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "PLANET ROCK",
    address: {
      rua: "Av. Esbertalina Barbosa Damiani",
      numero: "282-A",
      bairro: "Guriri Norte",
      cep: "29946-490",
      complemento: "Loja 1-2",
      referencia: "",
    }
  },
  {
    name: "CASA JAMILA",
    address: {
      rua: "Rua Rogério Campista Correia",
      numero: "361-N",
      bairro: "Guriri Norte",
      cep: "29946-350",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "PETISCOS",
    address: {
      rua: "Avenida Guriri",
      numero: "82",
      bairro: "Guriri",
      cep: "29946-100",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "TAKEDA SUSHI",
    address: {
      rua: "Av. Homero Zordan",
      numero: "117",
      bairro: "Guriri Norte",
      cep: "29946-380",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "OISHI SUSHI",
    address: {
      rua: "Av. Esbertalina Barbosa Damiani",
      numero: "146",
      bairro: "Guriri Norte",
      cep: "29946-490",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "POINT MILK SHAKE",
    address: {
      rua: "Av. Esbertalina Barbosa Damiani",
      numero: "245",
      bairro: "Guriri Norte",
      cep: "29946-490",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "MIZA CHURRASCARIA",
    address: {
      rua: "Avenida Oceano Atlântico",
      numero: "1501",
      bairro: "Guriri Sul",
      cep: "29945-490",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "SAMPAIO",
    address: {
      rua: "Av. Esbertalina Barbosa Damiani",
      numero: "570",
      bairro: "Guriri Norte",
      cep: "29946-490",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "OLIVA MASSAS",
    address: {
      rua: "Av. Oceano Atlântico",
      numero: "1060",
      bairro: "Guriri Sul",
      cep: "29945-480",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "SAARA",
    address: {
      rua: "Av. Oceano Atlântico",
      numero: "920",
      bairro: "Guriri Sul",
      cep: "29945-480",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "FARMÁCIA INDIANA",
    address: {
      rua: "Av. Gov. Eurico Vieira de Rezende",
      numero: "263",
      bairro: "Guriri Sul",
      cep: "29945-060",
      complemento: "Lotes 01 e 02",
      referencia: "",
    }
  },
  {
    name: "SÓ SALADA",
    address: {
      rua: "Av. Oceano Índico",
      numero: "S/N",
      bairro: "Guriri",
      cep: "29945-570",
      complemento: "",
      referencia: "",
    }
  },
  {
    name: "BASE 10 PLUS",
    address: {
      rua: "Av. Oceano Atlântico",
      numero: "S/N",
      bairro: "Guriri",
      cep: "29945-000",
      complemento: "",
      referencia: "",
    }
  },
];

async function importClientAddresses() {
  console.log('🏢 Iniciando importação de endereços dos clientes...\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const clientData of CLIENT_ADDRESSES) {
    try {
      // Busca o cliente pelo nome (case-insensitive)
      const existingClients = await db
        .select()
        .from(clients)
        .where(eq(clients.name, clientData.name));

      if (existingClients.length === 0) {
        console.log(`⚠️  Cliente não encontrado: ${clientData.name}`);
        notFound++;
        continue;
      }

      const client = existingClients[0];

      // Atualiza o endereço
      await db
        .update(clients)
        .set({
          rua: clientData.address.rua,
          numero: clientData.address.numero,
          bairro: clientData.address.bairro,
          cep: clientData.address.cep,
          complemento: clientData.address.complemento || null,
          referencia: clientData.address.referencia || null,
        })
        .where(eq(clients.id, client.id));

      console.log(`✅ ${clientData.name}: ${clientData.address.rua}, ${clientData.address.numero} - ${clientData.address.bairro}`);
      updated++;

    } catch (error) {
      console.error(`❌ Erro ao atualizar ${clientData.name}:`, error);
      errors++;
    }
  }

  console.log('\n📊 RESUMO DA IMPORTAÇÃO:');
  console.log(`✅ Atualizados: ${updated}`);
  console.log(`⚠️  Não encontrados: ${notFound}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`📦 Total processado: ${CLIENT_ADDRESSES.length}`);
}

// Executa o script
importClientAddresses()
  .then(() => {
    console.log('\n✨ Importação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
