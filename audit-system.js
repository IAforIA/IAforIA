// CRÍTICO: Carregar variáveis de ambiente PRIMEIRO
import 'dotenv/config';
// Script completo de auditoria do sistema
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './shared/schema.js';
const results = [];
async function audit() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         AUDITORIA COMPLETA DO SISTEMA GURIRI EXPRESS      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    // 1. VARIÁVEIS DE AMBIENTE
    console.log('📋 1. VERIFICANDO VARIÁVEIS DE AMBIENTE...\n');
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET', 'PORT'];
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            results.push({
                component: `ENV: ${envVar}`,
                status: '✅ OK',
                details: 'Configurada'
            });
            console.log(`  ✅ ${envVar}: Configurada`);
        }
        else {
            results.push({
                component: `ENV: ${envVar}`,
                status: '❌ ERRO',
                details: 'Não encontrada'
            });
            console.log(`  ❌ ${envVar}: NÃO ENCONTRADA`);
        }
    }
    // 2. BANCO DE DADOS
    console.log('\n📊 2. TESTANDO CONEXÃO COM BANCO DE DADOS...\n');
    try {
        const db = drizzle(neon(process.env.DATABASE_URL), { schema });
        // Testar cada tabela
        const tables = [
            { name: 'users', schema: schema.users },
            { name: 'motoboys', schema: schema.motoboys },
            { name: 'clients', schema: schema.clients },
            { name: 'orders', schema: schema.orders },
            { name: 'chat_messages', schema: schema.chatMessages },
            { name: 'motoboy_locations', schema: schema.motoboyLocations }
        ];
        for (const table of tables) {
            try {
                const count = await db.select().from(table.schema).limit(1);
                results.push({
                    component: `DB: ${table.name}`,
                    status: '✅ OK',
                    details: `${count.length} registro(s) acessível`
                });
                console.log(`  ✅ Tabela '${table.name}': Acessível`);
            }
            catch (error) {
                results.push({
                    component: `DB: ${table.name}`,
                    status: '❌ ERRO',
                    details: error.message
                });
                console.log(`  ❌ Tabela '${table.name}': ${error.message}`);
            }
        }
    }
    catch (error) {
        results.push({
            component: 'DB: Conexão',
            status: '❌ ERRO',
            details: error.message
        });
        console.log(`  ❌ Conexão falhou: ${error.message}`);
    }
    // 3. ESTRUTURA DE ARQUIVOS
    console.log('\n📁 3. VERIFICANDO ESTRUTURA DE ARQUIVOS...\n');
    const criticalFiles = [
        'server/index.ts',
        'server/routes.ts',
        'server/storage.ts',
        'server/vite.ts',
        'server/middleware/auth.ts',
        'client/src/main.tsx',
        'client/src/App.tsx',
        'client/src/pages/central-dashboard.tsx',
        'client/src/pages/client-dashboard.tsx',
        'client/src/pages/driver-dashboard.tsx',
        'shared/schema.ts',
        'package.json',
        'vite.config.ts',
        'tsconfig.json'
    ];
    const fs = await import('fs');
    const path = await import('path');
    for (const file of criticalFiles) {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            results.push({
                component: `FILE: ${file}`,
                status: '✅ OK',
                details: 'Existe'
            });
            console.log(`  ✅ ${file}`);
        }
        else {
            results.push({
                component: `FILE: ${file}`,
                status: '❌ ERRO',
                details: 'Não encontrado'
            });
            console.log(`  ❌ ${file}: NÃO ENCONTRADO`);
        }
    }
    // 4. DEPENDÊNCIAS
    console.log('\n📦 4. VERIFICANDO DEPENDÊNCIAS CRÍTICAS...\n');
    const criticalDeps = [
        'express',
        'react',
        'vite',
        'drizzle-orm',
        '@neondatabase/serverless',
        'ws',
        'jsonwebtoken',
        'bcryptjs'
    ];
    try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
        for (const dep of criticalDeps) {
            const version = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
            if (version) {
                results.push({
                    component: `DEP: ${dep}`,
                    status: '✅ OK',
                    details: `v${version}`
                });
                console.log(`  ✅ ${dep}: ${version}`);
            }
            else {
                results.push({
                    component: `DEP: ${dep}`,
                    status: '❌ ERRO',
                    details: 'Não instalada'
                });
                console.log(`  ❌ ${dep}: NÃO INSTALADA`);
            }
        }
    }
    catch (error) {
        console.log(`  ❌ Erro ao ler package.json: ${error.message}`);
    }
    // RELATÓRIO FINAL
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    RELATÓRIO FINAL                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    const ok = results.filter(r => r.status === '✅ OK').length;
    const errors = results.filter(r => r.status === '❌ ERRO').length;
    const warnings = results.filter(r => r.status === '⚠️ AVISO').length;
    console.log(`✅ Componentes OK: ${ok}`);
    console.log(`❌ Componentes com ERRO: ${errors}`);
    console.log(`⚠️ Componentes com AVISO: ${warnings}`);
    console.log(`📊 Total verificado: ${results.length}`);
    if (errors > 0) {
        console.log('\n❌ ERROS ENCONTRADOS:\n');
        results
            .filter(r => r.status === '❌ ERRO')
            .forEach(r => console.log(`  - ${r.component}: ${r.details}`));
    }
    console.log('\n' + '═'.repeat(60));
    console.log(errors === 0 ? '✅ SISTEMA PRONTO PARA USO' : '❌ SISTEMA COM PROBLEMAS CRÍTICOS');
    console.log('═'.repeat(60) + '\n');
    process.exit(errors > 0 ? 1 : 0);
}
audit().catch(console.error);
