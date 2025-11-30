import { PrismaClient } from '../app/generated/prisma';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables before initializing auth
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

import { auth } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding test database...');

	// Get Better Auth context for password hashing
	const ctx = await auth.$context;

	// Clean existing data (delete in correct order due to foreign keys)
	console.log('🧹 Cleaning existing data...');
	await prisma.clinicalCase.deleteMany();
	await prisma.examType.deleteMany();
	await prisma.account.deleteMany();
	await prisma.user.deleteMany();

	// Create test admin user
	const adminPassword = await ctx.password.hash('ristifou');
	const adminUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Test Admin',
			email: 'test-admin@larib-portal.test',
			emailVerified: true,
			role: 'ADMIN',
			applications: ['BESTOF_LARIB', 'CONGES'],
			accounts: {
				create: {
					id: randomUUID(),
					providerId: 'credential',
					accountId: 'test-admin@larib-portal.test',
					password: adminPassword,
				},
			},
		},
	});

	console.log('✅ Created admin user:', adminUser.email);

	// Create test regular user
	const userPassword = await ctx.password.hash('ristifou');
	const regularUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Test User',
			email: 'test-user@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB', 'CONGES'],
			accounts: {
				create: {
					id: randomUUID(),
					providerId: 'credential',
					accountId: 'test-user@larib-portal.test',
					password: userPassword,
				},
			},
		},
	});

	console.log('✅ Created regular user:', regularUser.email);

	// Create exam types first (using upsert to handle duplicates)
	console.log('📦 Creating exam types...');
	const examTypeNames = ['ECG', 'ECHO', 'HOLTER'];
	const createdExamTypes = [];

	for (const typeName of examTypeNames) {
		const examType = await prisma.examType.upsert({
			where: { name: typeName },
			update: {},
			create: {
				id: randomUUID(),
				name: typeName,
			},
		});
		createdExamTypes.push(examType);
	}

	console.log('✅ Created exam types');

	// Create test cases for bestof-larib
	console.log('📦 Creating test clinical cases...');
	const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

	for (let i = 0; i < 5; i++) {
		await prisma.clinicalCase.create({
			data: {
				id: randomUUID(),
				name: `Test Case ${i + 1}`,
				examType: {
					connect: {
						id: createdExamTypes[i % createdExamTypes.length].id,
					},
				},
				difficulty: difficulties[i % difficulties.length],
				status: 'PUBLISHED',
				createdBy: {
					connect: {
						id: adminUser.id,
					},
				},
				createdAt: new Date(
					Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
				), // Random date in last 30 days
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
