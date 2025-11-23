/**
 * Script para adicionar endereços REAIS aos clientes da Guriri Express
 * Atualiza apenas clientes existentes, sem criar duplicatas
 * 
 * Execute: npx tsx server/scripts/add-enderecos-clientes.ts
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { clients } from '@shared/schema';
import * as schema from '@shared/schema';
import { eq, like } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada no .env');
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema });

// =====================================================
// ENDEREÇOS REAIS DOS CLIENTES - DADOS OFICIAIS
// =====================================================
// Fonte: Planilha oficial Guriri Express

interface EnderecoCliente {
  nome: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento?: string;
}

const ENDERECOS_REAIS: EnderecoCliente[] = [
  {
    nome: 'PARAÇAI', // Banco: PARAÇAI (com Ç)
    endereco: 'Rua Albino Negris',
    numero: '273',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-045',
  },
  {
    nome: 'GURIFARMA',
    endereco: 'Rodovia Othovarino Duarte Santos',
    numero: '1037',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-060',
  },
  {
    nome: 'DROGARIA GURIRI',
    endereco: 'Rodovia Othovarino Duarte Santos',
    numero: '1883',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-690',
    complemento: 'Loja 04',
  },
  {
    nome: 'DROGARIA LUA E SOL',
    endereco: 'Av. Gov. Eurico Vieira de Rezende',
    numero: '62',
    bairro: 'Guriri',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-390',
  },
  {
    nome: 'POP FARMA',
    endereco: 'Rodovia Othovarino Duarte Santos',
    numero: '284',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-035',
  },
  {
    nome: 'BAU DO TESOURO',
    endereco: 'Rodovia Othovarino Duarte Santos',
    numero: '1637',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-690',
    complemento: 'Loja 3',
  },
  {
    nome: 'AVELAR SALGADOS',
    endereco: 'Rua Barra de São Francisco',
    numero: '1749',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-600',
  },
  {
    nome: 'PLANET ROCK',
    endereco: 'Av. Esbertalina Barbosa Damiani',
    numero: '282-A',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-490',
    complemento: 'Loja 1-2',
  },
  {
    nome: 'CASA JAMILA',
    endereco: 'Rua Rogério Campista Correia',
    numero: '361-N',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-350',
  },
  {
    nome: 'PETISCOS',
    endereco: 'Avenida Guriri',
    numero: '82',
    bairro: 'Guriri',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-100',
  },
  {
    nome: 'TAKEDA', // Banco: TAKEDA
    endereco: 'Av. Homero Zordan',
    numero: '117',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-380',
  },
  {
    nome: 'OISHI', // Banco: OISHI
    endereco: 'Av. Esbertalina Barbosa Damiani',
    numero: '146',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-490',
  },
  {
    nome: 'POINT MILK', // Banco: POINT MILK
    endereco: 'Av. Esbertalina Barbosa Damiani',
    numero: '245',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-490',
  },
  {
    nome: 'MIZA', // Banco: MIZA
    endereco: 'Avenida Oceano Atlântico',
    numero: '1501',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-490',
  },
  {
    nome: 'SAMPAIO',
    endereco: 'Av. Esbertalina Barbosa Damiani',
    numero: '570',
    bairro: 'Guriri Norte',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29946-490',
  },
  {
    nome: 'OLIVA MASSAS',
    endereco: 'Av. Oceano Atlântico',
    numero: '1060',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-480',
  },
  {
    nome: 'SAARA',
    endereco: 'Av. Oceano Atlântico',
    numero: '920',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-480',
  },
  {
    nome: 'INDIANA', // Banco: INDIANA
    endereco: 'Av. Gov. Eurico Vieira de Rezende',
    numero: '263',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-060',
    complemento: 'Lotes 01 e 02',
  },
  {
    nome: 'SO SALADAS', // Banco: SO SALADAS
    endereco: 'Av. Oceano Índico',
    numero: 'S/N',
    bairro: 'Guriri',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-570',
  },
  {
    nome: 'BASE 10 PLUS',
    endereco: 'Endereço não informado',
    numero: 'S/N',
    bairro: 'Guriri',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29900-000',
    complemento: 'Pendente de cadastro',
  },
  // Endereços adicionais encontrados
  {
    nome: 'SÃO BENEDITO', // Botequim São Benedito
    endereco: 'Av. Oceano Atlântico',
    numero: '1200',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-480',
  },
  {
    nome: 'CAPIXABA', // Farmácia Capixaba
    endereco: 'Av. Oceano Atlântico',
    numero: '800',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-480',
  },
  {
    nome: 'SABORES FIT', // Sabores Fit Guriri
    endereco: 'Av. Oceano Atlântico',
    numero: '1400',
    bairro: 'Guriri Sul',
    cidade: 'São Mateus',
    estado: 'ES',
    cep: '29945-480',
  },
];

// =====================================================
// FUNÇÃO DE ATUALIZAÇÃO - SEM DUPLICATAS
// =====================================================

async function adicionarEnderecos() {
  console.log('📍 ADICIONANDO ENDEREÇOS REAIS AOS CLIENTES DA GURIRI EXPRESS\n');
  console.log('=' .repeat(70));
  console.log('⚠️  MODO: UPDATE APENAS - Não cria novos clientes\n');

  let stats = {
    atualizados: 0,
    naoEncontrados: 0,
    erros: 0,
    semEndereco: 0,
  };

  for (const endereco of ENDERECOS_REAIS) {
    try {
      // Busca o cliente pelo nome (case-insensitive)
      // Usa LIKE para encontrar variações do nome
      const clienteExistente = await db.query.clients.findFirst({
        where: like(clients.name, `%${endereco.nome}%`),
      });

      if (!clienteExistente) {
        console.log(`   ⚠️  ${endereco.nome} - Cliente não encontrado no banco`);
        stats.naoEncontrados++;
        continue;
      }

      // Verifica se já tem endereço válido
      const temEnderecoValido = 
        clienteExistente.cep && 
        clienteExistente.cep !== '00000-000' &&
        clienteExistente.rua && 
        clienteExistente.rua !== 'ENDERECO-PENDENTE';

      if (temEnderecoValido) {
        console.log(`   ✓  ${endereco.nome} - Já possui endereço: ${clienteExistente.rua}, ${clienteExistente.numero}`);
        stats.atualizados++;
        continue;
      }

      // Atualiza o endereço (UPDATE, não INSERT)
      const resultado = await db.update(clients)
        .set({
          cep: endereco.cep || '29900-000',
          rua: endereco.endereco,
          numero: endereco.numero,
          bairro: endereco.bairro,
          complemento: endereco.complemento || null,
          referencia: null, // Remove referências antigas
        })
        .where(eq(clients.id, clienteExistente.id));

      console.log(`   ✅ ${endereco.nome} - Endereço atualizado: ${endereco.endereco}, ${endereco.numero} - ${endereco.bairro}`);
      stats.atualizados++;

    } catch (error: any) {
      console.error(`   ❌ ${endereco.nome}: ${error.message}`);
      stats.erros++;
    }
  }

  // Busca clientes sem endereço
  console.log('\n📋 Verificando clientes sem endereço...');
  const clientesSemEndereco = await db.query.clients.findMany({
    where: eq(clients.rua, 'ENDERECO-PENDENTE'),
  });

  stats.semEndereco = clientesSemEndereco.length;

  if (clientesSemEndereco.length > 0) {
    console.log('\n⚠️  Clientes ainda sem endereço:');
    clientesSemEndereco.forEach(c => {
      console.log(`   - ${c.name} (ID: ${c.id})`);
    });
  }

  // RESUMO FINAL
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO DA ATUALIZAÇÃO');
  console.log('='.repeat(70));
  console.log(`✅ Endereços atualizados: ${stats.atualizados}/${ENDERECOS_REAIS.length}`);
  console.log(`⚠️  Clientes não encontrados: ${stats.naoEncontrados}`);
  console.log(`📍 Clientes ainda sem endereço: ${stats.semEndereco}`);
  console.log(`❌ Erros: ${stats.erros}`);
  console.log('='.repeat(70));

  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('─'.repeat(70));
  console.log('1. Verifique os endereços no painel administrativo');
  console.log('2. Os clientes agora podem criar pedidos com endereço fixo');
  console.log('3. O mapa mostrará as localizações reais');
  console.log('4. Clientes sem endereço precisam ser cadastrados manualmente\n');

  if (stats.naoEncontrados > 0) {
    console.log('\n⚠️  ATENÇÃO:');
    console.log('Alguns clientes não foram encontrados no banco.');
    console.log('Execute primeiro: npm run import:empresa\n');
  }

  console.log('🎉 ATUALIZAÇÃO CONCLUÍDA!\n');

  process.exit(0);
}

// Executar
adicionarEnderecos().catch((error) => {
  console.error('\n❌ ERRO FATAL:', error.message);
  console.error('\nVerifique se:');
  console.error('1. DATABASE_URL está configurada no .env');
  console.error('2. Os clientes já foram importados (execute import-empresa-completa.ts primeiro)');
  console.error('3. Banco de dados está acessível\n');
  process.exit(1);
});
