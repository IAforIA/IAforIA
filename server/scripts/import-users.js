/**
 * Script para importar usuários da empresa em massa
 *
 * USO:
 * 1. Configure DATABASE_URL no .env
 * 2. Edite a lista USUARIOS_EMPRESA abaixo com seus dados reais
 * 3. Execute: npx tsx server/scripts/import-users.ts
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, motoboys, clients } from '@shared/schema';
import bcrypt from 'bcryptjs';
import * as schema from '@shared/schema';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada no .env');
}
const db = drizzle(neon(process.env.DATABASE_URL), { schema });
// =====================================================
// CONFIGURE AQUI OS DADOS DOS SEUS USUÁRIOS
// =====================================================
const USUARIOS_EMPRESA = [
    // CENTRAL DE OPERAÇÕES
    {
        tipo: 'central',
        id: 'admin-001',
        nome: 'Central Guriri Express',
        email: 'admin@guriri.com',
        telefone: '27999999999',
        senha: 'AdminGuriri2024!', // MUDE ESTA SENHA!
    },
    // CLIENTES (adicione todos os 28)
    {
        tipo: 'client',
        id: 'client-001',
        nome: 'Padaria Pão Quente',
        email: 'padaria@email.com',
        telefone: '27988881111',
        senha: 'Temp123',
        empresa: 'Padaria Pão Quente Ltda',
    },
    {
        tipo: 'client',
        id: 'client-002',
        nome: 'Restaurante Sabor',
        email: 'restaurante@email.com',
        telefone: '27988882222',
        senha: 'Temp123',
        empresa: 'Restaurante Sabor Ltda',
    },
    // ... adicione os outros 26 clientes aqui
    // MOTOBOYS (adicione todos os 10)
    {
        tipo: 'motoboy',
        id: 'moto-001',
        nome: 'João Silva',
        email: 'joao.moto@email.com',
        telefone: '27977771111',
        senha: 'Moto123',
        placa: 'ABC-1234',
        cpf: '123.456.789-00',
        taxaPadrao: '7.00',
    },
    {
        tipo: 'motoboy',
        id: 'moto-002',
        nome: 'Maria Santos',
        email: 'maria.moto@email.com',
        telefone: '27977772222',
        senha: 'Moto123',
        placa: 'DEF-5678',
        cpf: '987.654.321-00',
        taxaPadrao: '7.00',
    },
    // ... adicione os outros 8 motoboys aqui
];
// =====================================================
// FUNÇÃO DE IMPORTAÇÃO
// =====================================================
async function importarUsuarios() {
    console.log('🚀 Iniciando importação de usuários...\n');
    let contadores = {
        central: 0,
        clientes: 0,
        motoboys: 0,
        erros: 0,
    };
    for (const usuario of USUARIOS_EMPRESA) {
        try {
            console.log(`Processando: ${usuario.nome} (${usuario.tipo})...`);
            // Hash da senha
            const senhaHash = await bcrypt.hash(usuario.senha, 10);
            // Criar registro na tabela users
            await db.insert(users).values({
                id: usuario.id,
                name: usuario.nome,
                role: usuario.tipo,
                email: usuario.email,
                phone: usuario.telefone,
                password: senhaHash,
                status: 'active',
            });
            // Criar registro específico por tipo
            if (usuario.tipo === 'client') {
                await db.insert(clients).values({
                    id: usuario.id,
                    name: usuario.nome,
                    phone: usuario.telefone,
                    email: usuario.email,
                    company: usuario.empresa || usuario.nome,
                });
                contadores.clientes++;
            }
            else if (usuario.tipo === 'motoboy') {
                await db.insert(motoboys).values({
                    id: usuario.id,
                    name: usuario.nome,
                    phone: usuario.telefone,
                    placa: usuario.placa || '',
                    cpf: usuario.cpf || '',
                    taxaPadrao: usuario.taxaPadrao || '7.00',
                    status: 'ativo',
                    online: false,
                });
                contadores.motoboys++;
            }
            else if (usuario.tipo === 'central') {
                contadores.central++;
            }
            console.log(`✅ ${usuario.nome} criado com sucesso!`);
        }
        catch (error) {
            console.error(`❌ Erro ao criar ${usuario.nome}:`, error.message);
            contadores.erros++;
        }
    }
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA IMPORTAÇÃO');
    console.log('='.repeat(50));
    console.log(`✅ Central de Operações: ${contadores.central}`);
    console.log(`✅ Clientes importados: ${contadores.clientes}`);
    console.log(`✅ Motoboys importados: ${contadores.motoboys}`);
    console.log(`❌ Erros: ${contadores.erros}`);
    console.log('='.repeat(50));
    console.log('\n🎉 Importação concluída!\n');
    // Informações importantes
    console.log('⚠️  IMPORTANTE:');
    console.log('1. Compartilhe as credenciais (email/senha) com cada usuário');
    console.log('2. Oriente os usuários a trocarem a senha no primeiro acesso');
    console.log('3. Guarde uma cópia segura das credenciais de admin');
    console.log('4. Acesse o sistema em: http://localhost:5000 (ou seu domínio)');
    console.log('\n📝 Credenciais de acesso:');
    console.log('- Central: admin@guriri.com / AdminGuriri2024!');
    console.log('- Clientes: (email cadastrado) / Temp123');
    console.log('- Motoboys: (email cadastrado) / Moto123\n');
    process.exit(0);
}
// Executar importação
importarUsuarios().catch((error) => {
    console.error('❌ Erro fatal na importação:', error);
    process.exit(1);
});
