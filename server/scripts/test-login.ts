
import 'dotenv/config';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function testLogin() {
  const email = 'cliente.dev@guriri.local';
  const password = '12345678';

  console.log(`Testing login for ${email}...`);

  try {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1).then(res => res[0]);

    if (!user) {
      console.error('❌ User not found in database!');
      process.exit(1);
    }

    console.log('✅ User found:', user.id, user.role);
    // console.log('Stored hash:', user.password);

    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log('✅ Password match! Login should work.');
    } else {
      console.error('❌ Password mismatch!');
      
      // Debug: generate hash for 12345678 to compare
      const newHash = await bcrypt.hash(password, 10);
      console.log('Expected hash format example:', newHash);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  process.exit(0);
}

testLogin();
