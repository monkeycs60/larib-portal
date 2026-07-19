import { PrismaClient } from '../app/generated/prisma';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables before initializing auth.
// `override: true` is required: importing `../lib/auth` (hoisted above this line)
// initializes Prisma, which auto-loads `.env` and sets DATABASE_URL to the dev db
// first. Without override this seed would wipe/write the DEV database instead of testdb.
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test'), override: true });

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
	await prisma.authorshipAffiliation.deleteMany();
	await prisma.authorship.deleteMany();
	await prisma.submission.deleteMany();
	await prisma.journalTarget.deleteMany();
	await prisma.article.deleteMany();
	await prisma.study.deleteMany();
	await prisma.author.deleteMany();
	await prisma.affiliation.deleteMany();
	await prisma.centre.deleteMany();
	await prisma.journal.deleteMany();
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

	// Create per-app admin users for RBAC tests
	const congesAdminPassword = await ctx.password.hash('ristifou');
	const congesAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Conges Admin',
			email: 'conges-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['CONGES'],
			adminApplications: ['CONGES'],
			congesTotalDays: 30,
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'conges-admin@larib-portal.test', password: congesAdminPassword } },
		},
	});
	console.log('✅ Created Conges admin:', congesAdmin.email);

	const bestofAdminPassword = await ctx.password.hash('ristifou');
	const bestofAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Bestof Admin',
			email: 'bestof-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
			adminApplications: ['BESTOF_LARIB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'bestof-admin@larib-portal.test', password: bestofAdminPassword } },
		},
	});
	console.log('✅ Created Bestof admin:', bestofAdmin.email);

	// Create publications users (member + app-admin) for RBAC tests
	const publicationsAdminPassword = await ctx.password.hash('ristifou');
	const publicationsAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Publications Admin',
			email: 'publications-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['PUBLICATIONS'],
			adminApplications: ['PUBLICATIONS'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'publications-admin@larib-portal.test', password: publicationsAdminPassword } },
		},
	});
	console.log('✅ Created Publications admin:', publicationsAdmin.email);

	const publicationsUserPassword = await ctx.password.hash('ristifou');
	const publicationsUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Publications User',
			email: 'publications-user@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['PUBLICATIONS'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'publications-user@larib-portal.test', password: publicationsUserPassword } },
		},
	});
	console.log('✅ Created Publications user:', publicationsUser.email);

	// Minimal publications sample dataset (article where publicationsUser is first author)
	const publicationsJournal = await prisma.journal.create({
		data: { name: 'European Heart Journal', publisher: 'Oxford University Press', impactFactor: 39.3 },
	});
	const publicationsCentre = await prisma.centre.create({
		data: { name: 'Lariboisière Hospital', city: 'Paris', country: 'France' },
	});
	await prisma.centre.upsert({
		where: { name: 'Hôpital Européen Georges-Pompidou, AP-HP' },
		update: {},
		create: { name: 'Hôpital Européen Georges-Pompidou, AP-HP', city: 'Paris', country: 'France', isOwn: true },
	});
	await prisma.centre.upsert({
		where: { name: 'Università degli Studi di Milano' },
		update: {},
		create: { name: 'Università degli Studi di Milano', city: 'Milano', country: 'Italy', isOwn: false },
	});
	const publicationsAffiliation = await prisma.affiliation.create({
		data: {
			name: 'Lariboisière Hospital, APHP, Paris, France',
			institution: 'APHP',
			city: 'Paris',
			country: 'France',
			centre: { connect: { id: publicationsCentre.id } },
		},
	});
	const publicationsFirstAuthor = await prisma.author.create({
		data: {
			firstName: 'Publications',
			lastName: 'User',
			degrees: 'MD',
			emails: [publicationsUser.email],
			user: { connect: { id: publicationsUser.id } },
			defaultAffiliation: { connect: { id: publicationsAffiliation.id } },
		},
	});
	const publicationsCoAuthor = await prisma.author.create({
		data: {
			firstName: 'Jane',
			lastName: 'Coauthor',
			degrees: 'MD, PhD',
			emails: ['jane.coauthor@larib-portal.test'],
			defaultAffiliation: { connect: { id: publicationsAffiliation.id } },
		},
	});
	const publicationsStudy = await prisma.study.create({
		data: { title: 'MULTIVALVE registry', description: 'Retrospective multi-valve cohort', createdBy: { connect: { id: publicationsAdmin.id } } },
	});
	await prisma.article.create({
		data: {
			title: 'Outcomes of multi-valve intervention: a retrospective cohort',
			type: 'ORIGINAL',
			status: 'UNDER_REVIEW',
			study: { connect: { id: publicationsStudy.id } },
			createdBy: { connect: { id: publicationsUser.id } },
			authorships: {
				create: [
					{ order: 1, author: { connect: { id: publicationsFirstAuthor.id } } },
					{ order: 2, isCorresponding: true, author: { connect: { id: publicationsCoAuthor.id } } },
				],
			},
		},
	});
	console.log('✅ Created publications sample data');

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
	// Use dynamic dates to ensure contract is always valid
	const contractStartDate = new Date();
	contractStartDate.setFullYear(contractStartDate.getFullYear() - 2);
	const contractEndDate = new Date();
	contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);

	await prisma.user.update({
		where: { id: regularUser.id },
		data: {
			congesTotalDays: 30,
			arrivalDate: contractStartDate,
			departureDate: contractEndDate,
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
	console.log('  Conges Admin: conges-admin@larib-portal.test / ristifou');
	console.log('  Bestof Admin: bestof-admin@larib-portal.test / ristifou');
	console.log('  Publications Admin: publications-admin@larib-portal.test / ristifou');
	console.log('  Publications User: publications-user@larib-portal.test / ristifou');
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
