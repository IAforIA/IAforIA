/**
 * Script para importar os 10 motoboys reais da Guriri Express
 *
 * Execute: npx tsx server/scripts/import-motoboys-reais.ts
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, motoboys } from '@shared/schema';
import bcrypt from 'bcryptjs';
import * as schema from '@shared/schema';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada no .env');
}
const db = drizzle(neon(process.env.DATABASE_URL), { schema });
// =====================================================
// SEUS 10 MOTOBOYS REAIS
// =====================================================
const MOTOBOYS_GURIRI = [
    {
        id: 'moto-joao',
        nome: 'JOÃO',
        telefone: '27999694181',
        email: 'joao@guriri.com',
        senha: 'Guriri2024',
        placa: '', // Adicionar depois
        cpf: '', // Adicionar depois
    },
    {
        id: 'moto-yuri',
        nome: 'YURI',
        telefone: '27998869204',
        email: 'yuri@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-douglas',
        nome: 'DOUGLAS',
        telefone: '27996132205',
        email: 'douglas@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-bruno',
        nome: 'BRUNO',
        telefone: '27992264338',
        email: 'bruno@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-guilherme',
        nome: 'GUILHERME',
        telefone: '27996304092',
        email: 'guilherme@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-victor',
        nome: 'VICTOR HUGO',
        telefone: '21970257886',
        email: 'victor@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-otavio',
        nome: 'OTAVIO',
        telefone: '27997112700',
        email: 'otavio@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-davi',
        nome: 'DAVI',
        telefone: '27997638737',
        email: 'davi@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-felipe',
        nome: 'FELIPE',
        telefone: '27992690704',
        email: 'felipe@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
    {
        id: 'moto-cristiano',
        nome: 'CRISTIANO',
        telefone: '27996048857',
        email: 'cristiano@guriri.com',
        senha: 'Guriri2024',
        placa: '',
        cpf: '',
    },
];
// =====================================================
// ADMIN DA CENTRAL
// =====================================================
const ADMIN_CENTRAL = {
    id: 'admin-001',
    nome: 'Central Guriri Express',
    telefone: '27999999999', // Coloque o telefone real da central
    email: 'admin@guriri.com',
    senha: 'AdminGuriri2024!',
};
// =====================================================
// FUNÇÃO DE IMPORTAÇÃO
// =====================================================
async function importarMotoboys() {
    console.log('🚀 Iniciando importação dos motoboys da Guriri Express...\n');
    // 1. Criar usuário admin da central
    try {
        console.log('Criando usuário admin da central...');
        const senhaHashAdmin = await bcrypt.hash(ADMIN_CENTRAL.senha, 10);
        await db.insert(users).values({
            id: ADMIN_CENTRAL.id,
            name: ADMIN_CENTRAL.nome,
            role: 'central',
            email: ADMIN_CENTRAL.email,
            phone: ADMIN_CENTRAL.telefone,
            password: senhaHashAdmin,
            status: 'active',
        });
        console.log('✅ Admin criado com sucesso!\n');
    }
    catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
            console.log('⚠️  Admin já existe, pulando...\n');
        }
        else {
            console.error('❌ Erro ao criar admin:', error.message);
        }
    }
    // 2. Criar os 10 motoboys
    let sucesso = 0;
    let erros = 0;
    for (const motoboy of MOTOBOYS_GURIRI) {
        try {
            console.log(`Processando: ${motoboy.nome} (${motoboy.telefone})...`);
            const senhaHash = await bcrypt.hash(motoboy.senha, 10);
            // Criar na tabela users
            await db.insert(users).values({
                id: motoboy.id,
                name: motoboy.nome,
                role: 'motoboy',
                email: motoboy.email,
                phone: motoboy.telefone,
                password: senhaHash,
                status: 'active',
            });
            // Criar na tabela motoboys
            await db.insert(motoboys).values({
                id: motoboy.id,
                name: motoboy.nome,
                phone: motoboy.telefone,
                placa: motoboy.placa,
                cpf: motoboy.cpf,
                taxaPadrao: '7.00',
                status: 'ativo',
                online: false,
            });
            console.log(`✅ ${motoboy.nome} criado com sucesso!`);
            sucesso++;
        }
        catch (error) {
            if (error.message.includes('duplicate') || error.message.includes('unique')) {
                console.log(`⚠️  ${motoboy.nome} já existe, pulando...`);
            }
            else {
                console.error(`❌ Erro ao criar ${motoboy.nome}:`, error.message);
                erros++;
            }
        }
    }
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA IMPORTAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Motoboys importados com sucesso: ${sucesso}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Importação concluída!\n');
    console.log('📝 CREDENCIAIS DE ACESSO:');
    console.log('─'.repeat(60));
    console.log('\n👨‍💼 CENTRAL (Admin):');
    console.log(`   Email: ${ADMIN_CENTRAL.email}`);
    console.log(`   Senha: ${ADMIN_CENTRAL.senha}`);
    console.log(`   URL: http://localhost:5000/central\n`);
    console.log('🏍️  MOTOBOYS:');
    console.log(`   Senha padrão para todos: Guriri2024`);
    console.log(`   URL: http://localhost:5000/driver\n`);
    MOTOBOYS_GURIRI.forEach(m => {
        console.log(`   ${m.nome.padEnd(15)} - ${m.email.padEnd(25)} - ${m.telefone}`);
    });
    console.log('\n⚠️  IMPORTANTE:');
    console.log('1. Compartilhe as credenciais via WhatsApp com cada motoboy');
    console.log('2. Oriente-os a trocar a senha no primeiro acesso');
    console.log('3. Adicione as placas e CPFs depois diretamente no sistema');
    console.log('4. Sistema pronto para uso!\n');
    process.exit(0);
}
// Executar importação
importarMotoboys().catch((error) => {
    console.error('❌ Erro fatal na importação:', error);
    process.exit(1);
});
