import { PrismaClient } from '../app/generated/prisma';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    where: {
      user: {
        email: {
          in: ['test-admin@larib-portal.test', 'test-user@larib-portal.test']
        }
      }
    },
    include: { user: { select: { email: true, name: true } } }
  });

  console.log('Found accounts:', accounts.length);
  accounts.forEach(acc => {
    console.log('\n---');
    console.log('Email:', acc.user?.email);
    console.log('Name:', acc.user?.name);
    console.log('Password format:', acc.password?.substring(0, 60));
    console.log('Password length:', acc.password?.length);
    console.log('Has colon (scrypt format):', acc.password?.includes(':'));
    console.log('Starts with $2 (bcrypt format):', acc.password?.startsWith('$2'));
  });

  await prisma.$disconnect();
}

main().catch(console.error);
