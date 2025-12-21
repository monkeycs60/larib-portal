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
	await prisma.leaveRequest.deleteMany();
	await prisma.caseAttempt.deleteMany();
	await prisma.userCaseSettings.deleteMany();
	await prisma.clinicalCase.deleteMany();
	await prisma.examType.deleteMany();
	await prisma.verification.deleteMany();
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
			firstName: 'Test',
			lastName: 'User',
			email: 'test-user@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB', 'CONGES'],
			congesTotalDays: 30,
			position: 'Developer',
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

	// Create a placeholder user (invitation sent, no password yet)
	const placeholderUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: null,
			firstName: 'Placeholder',
			lastName: 'User',
			email: 'placeholder@larib-portal.test',
			emailVerified: false,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
		},
	});

	// Create invitation for placeholder user (valid for 7 days)
	await prisma.verification.create({
		data: {
			id: randomUUID(),
			identifier: `INVITE:${placeholderUser.email}`,
			value: JSON.stringify({
				email: placeholderUser.email,
				locale: 'en',
				firstName: 'Placeholder',
				lastName: 'User',
				role: 'USER',
				applications: ['BESTOF_LARIB'],
				token: 'test-invitation-token',
			}),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
		},
	});

	console.log('✅ Created placeholder user with pending invitation:', placeholderUser.email);

	// Create a placeholder user with expired invitation
	const expiredPlaceholderUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: null,
			firstName: 'Expired',
			lastName: 'Invitation',
			email: 'expired@larib-portal.test',
			emailVerified: false,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
		},
	});

	// Create expired invitation
	await prisma.verification.create({
		data: {
			id: randomUUID(),
			identifier: `INVITE:${expiredPlaceholderUser.email}`,
			value: JSON.stringify({
				email: expiredPlaceholderUser.email,
				locale: 'en',
				firstName: 'Expired',
				lastName: 'Invitation',
				role: 'USER',
				applications: ['BESTOF_LARIB'],
				token: 'expired-invitation-token',
			}),
			expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 1 day ago
		},
	});

	console.log('✅ Created placeholder user with expired invitation:', expiredPlaceholderUser.email);

	// Create a user without CONGES access for filtering tests
	const noCongesPassword = await ctx.password.hash('ristifou');
	const userWithoutConges = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'No Conges User',
			email: 'no-conges@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
			congesTotalDays: 25,
			accounts: {
				create: {
					id: randomUUID(),
					providerId: 'credential',
					accountId: 'no-conges@larib-portal.test',
					password: noCongesPassword,
				},
			},
		},
	});

	console.log('✅ Created user without CONGES access:', userWithoutConges.email);

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
	const statuses = ['PUBLISHED', 'DRAFT'] as const;

	const createdCases: Array<{ id: string; name: string }> = [];

	for (let i = 0; i < 6; i++) {
		const caseData = await prisma.clinicalCase.create({
			data: {
				id: randomUUID(),
				name: `Test Case ${i + 1}`,
				examType: {
					connect: {
						id: createdExamTypes[i % createdExamTypes.length].id,
					},
				},
				difficulty: difficulties[i % difficulties.length],
				status: statuses[i < 4 ? 0 : 1],
				createdBy: {
					connect: {
						id: adminUser.id,
					},
				},
				createdAt: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
			},
		});
		createdCases.push({ id: caseData.id, name: `Test Case ${i + 1}` });
	}

	console.log('✅ Created 6 test clinical cases');

	console.log('📦 Creating user attempts and settings for sorting tests...');

	await prisma.caseAttempt.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[0].id,
			validatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
		},
	});

	await prisma.caseAttempt.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[1].id,
			validatedAt: null,
		},
	});

	await prisma.userCaseSettings.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[0].id,
			personalDifficulty: 'ADVANCED',
		},
	});

	await prisma.userCaseSettings.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[1].id,
			personalDifficulty: 'BEGINNER',
		},
	});

	await prisma.userCaseSettings.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[2].id,
			personalDifficulty: 'INTERMEDIATE',
		},
	});

	console.log('✅ Created user attempts and settings');

	console.log('📦 Creating leave request test data...');

	// Set up user with leave allocation and contract dates
	await prisma.user.update({
		where: { id: regularUser.id },
		data: {
			congesTotalDays: 30,
			arrivalDate: new Date('2024-01-01'),
			departureDate: new Date('2025-12-31'),
		},
	});

	await prisma.leaveRequest.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			startDate: new Date('2024-12-19'),
			endDate: new Date('2024-12-27'),
			status: 'APPROVED',
			approverId: adminUser.id,
			decisionAt: new Date('2024-12-01'),
		},
	});

	// Create a leave for the user WITHOUT CONGES access (should be filtered out in admin view)
	const today = new Date();
	const noCongesLeaveStart = new Date(today);
	noCongesLeaveStart.setDate(today.getDate() - 1);
	const noCongesLeaveEnd = new Date(today);
	noCongesLeaveEnd.setDate(today.getDate() + 2);

	await prisma.leaveRequest.create({
		data: {
			id: randomUUID(),
			userId: userWithoutConges.id,
			startDate: noCongesLeaveStart,
			endDate: noCongesLeaveEnd,
			reason: 'Should not appear in admin view',
			status: 'APPROVED',
			approverId: adminUser.id,
			decisionAt: new Date(),
		},
	});

	console.log('✅ Created leave request test data');

	console.log('✨ Test database seeded successfully!');
	console.log('');
	console.log('Test credentials:');
	console.log('  Admin: test-admin@larib-portal.test / ristifou');
	console.log('  User:  test-user@larib-portal.test / ristifou');
	console.log('  No Conges User: no-conges@larib-portal.test / ristifou');
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
