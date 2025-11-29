import { PrismaClient } from '../app/generated/prisma';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test database...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.user.deleteMany();

  // Create test admin user
  const adminPassword = await hash('ristifou', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Test Admin',
      email: 'test-admin@larib-portal.test',
      emailVerified: true,
      role: 'admin',
      accounts: {
        create: {
          providerId: 'credential',
          accountId: 'test-admin@larib-portal.test',
          password: adminPassword,
        },
      },
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create test regular user
  const userPassword = await hash('ristifou', 10);
  const regularUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test-user@larib-portal.test',
      emailVerified: true,
      role: 'user',
      accounts: {
        create: {
          providerId: 'credential',
          accountId: 'test-user@larib-portal.test',
          password: userPassword,
        },
      },
    },
  });

  console.log('✅ Created regular user:', regularUser.email);

  // Create test cases for bestof-larib (optional)
  console.log('📦 Creating test clinical cases...');

  const examTypes = ['ECG', 'ECHO', 'HOLTER'] as const;
  const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

  for (let i = 0; i < 5; i++) {
    await prisma.clinicalCase.create({
      data: {
        name: `Test Case ${i + 1}`,
        examType: examTypes[i % examTypes.length],
        difficulty: difficulties[i % difficulties.length],
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
      },
    });
  }

  console.log('✅ Created 5 test clinical cases');

  console.log('✨ Test database seeded successfully!');
  console.log('');
  console.log('Test credentials:');
  console.log('  Admin: test-admin@larib-portal.test / ristifou');
  console.log('  User:  test-user@larib-portal.test / ristifou');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
