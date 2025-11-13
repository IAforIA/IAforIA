import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// CRÍTICO: Garante que a aplicação não inicie sem a URL do BD
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required.");
}

// db agora é garantido que não é nulo
export const db = drizzle(neon(process.env.DATABASE_URL), { schema });
