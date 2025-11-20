import { db } from '../db.js'; // Adicionado .js para compatibilidade ESM
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';
// import { sql } from 'drizzle-orm'; // <-- REMOVIDO: Importação não utilizada
async function seedUsers() {
    try {
        console.log('🌱 Criando usuários de teste...');
        // Define o tipo para garantir que os objetos de usuário estejam corretos antes do hash
        const testUsers = [
            { id: 'central', name: 'Central Guriri', role: 'central', password: 'central123' },
            { id: 'client', name: 'Cliente Exemplo', role: 'client', password: 'client123' },
            { id: 'motoboy', name: 'João Motoboy', role: 'motoboy', password: 'motoboy123' }
        ];
        // Mapeia e gera os hashes das senhas em paralelo para melhor performance
        const hashedUsers = await Promise.all(testUsers.map(async (user) => ({
            ...user,
            password: await bcrypt.hash(user.password, 10),
            // Adicione quaisquer outros campos obrigatórios que possam existir no schema users, como status: 'active'
            status: 'active',
        })));
        // Tenta inserir todos de uma vez, usando onConflictDoNothing para evitar duplicatas
        await db.insert(users)
            .values(hashedUsers)
            .onConflictDoNothing();
        console.log(`✓ Usuários criados ou já existentes: ${hashedUsers.map(u => u.id).join(', ')}`);
        console.log('\n✅ Seed concluído!');
        console.log('\n📋 Credenciais de acesso:');
        console.log('   Central: central / central123');
        console.log('   Cliente: client / client123');
        console.log('   Motoboy: motoboy / motoboy123');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Erro ao criar usuários:', error);
        process.exit(1);
    }
}
seedUsers();
