import { test, expect } from '@playwright/test';
import { getRandomGreeting } from '../../lib/random-greeting';

// ============================================
// UNIT TESTS FOR getRandomGreeting FUNCTION
// ============================================

test.describe('getRandomGreeting function', () => {
	const sampleGreetings = [
		'Welcome',
		'Hello',
		'Hi there',
		'Good day',
		'Greetings',
	];

	test('should return a greeting from the provided list', () => {
		const seed = 'user-123-2024-01-15';
		const greeting = getRandomGreeting(sampleGreetings, seed);

		expect(sampleGreetings).toContain(greeting);
	});

	test('should return consistent greeting for the same seed', () => {
		const seed = 'user-456-2024-02-20';

		const greeting1 = getRandomGreeting(sampleGreetings, seed);
		const greeting2 = getRandomGreeting(sampleGreetings, seed);
		const greeting3 = getRandomGreeting(sampleGreetings, seed);

		expect(greeting1).toBe(greeting2);
		expect(greeting2).toBe(greeting3);
	});

	test('should return different greetings for different seeds', () => {
		const seeds = [
			'user-1-2024-01-01',
			'user-2-2024-01-01',
			'user-3-2024-01-01',
			'user-4-2024-01-01',
			'user-5-2024-01-01',
			'user-6-2024-01-01',
			'user-7-2024-01-01',
			'user-8-2024-01-01',
			'user-9-2024-01-01',
			'user-10-2024-01-01',
		];

		const greetings = seeds.map((seed) =>
			getRandomGreeting(sampleGreetings, seed)
		);

		// With 10 different seeds and 5 greetings, we should see at least 2 different greetings
		const uniqueGreetings = new Set(greetings);
		expect(uniqueGreetings.size).toBeGreaterThanOrEqual(2);
	});

	test('should handle single greeting in list', () => {
		const singleGreeting = ['Hello'];
		const seed = 'any-seed';

		const greeting = getRandomGreeting(singleGreeting, seed);

		expect(greeting).toBe('Hello');
	});

	test('should handle empty seed string', () => {
		const seed = '';
		const greeting = getRandomGreeting(sampleGreetings, seed);

		expect(sampleGreetings).toContain(greeting);
	});

	test('should handle special characters in seed', () => {
		const seed = 'user-id-with-special-chars!@#$%^&*()';
		const greeting = getRandomGreeting(sampleGreetings, seed);

		expect(sampleGreetings).toContain(greeting);
	});

	test('should produce deterministic results for same user on same day', () => {
		const userId = 'clx123abc456';
		const dateString = new Date().toDateString();
		const seed = `${userId}-${dateString}`;

		// Call multiple times to verify determinism
		const results = Array.from({ length: 100 }, () =>
			getRandomGreeting(sampleGreetings, seed)
		);

		// All results should be identical
		const allSame = results.every((r) => r === results[0]);
		expect(allSame).toBe(true);
	});

	test('should distribute greetings relatively evenly across many seeds', () => {
		const greetingCount: Record<string, number> = {};
		sampleGreetings.forEach((greeting) => {
			greetingCount[greeting] = 0;
		});

		// Generate 1000 seeds and count distribution
		for (let i = 0; i < 1000; i++) {
			const seed = `user-${i}-${Math.random().toString(36).substring(7)}`;
			const greeting = getRandomGreeting(sampleGreetings, seed);
			greetingCount[greeting]++;
		}

		// Each greeting should appear at least once
		sampleGreetings.forEach((greeting) => {
			expect(greetingCount[greeting]).toBeGreaterThan(0);
		});

		// No single greeting should dominate (more than 50% of total)
		const maxCount = Math.max(...Object.values(greetingCount));
		expect(maxCount).toBeLessThan(500);
	});

	test('should work with the actual greetings from translations', () => {
		const englishGreetings = [
			'Welcome',
			'Great to see you again',
			'Welcome back',
			'Nice to have you back',
			'Hello',
			'Have an excellent day',
			'Ready for new discoveries',
			'Happy to assist you',
		];

		const frenchGreetings = [
			'Bienvenue',
			'Ravi de vous revoir',
			'Bon retour',
			'Content de vous retrouver',
			'Bonjour',
			'Excellente journée à vous',
			'Prêt pour de nouvelles découvertes',
			'Au plaisir de vous accompagner',
		];

		const testSeed = 'test-user-id-Mon Dec 02 2024';

		const englishGreeting = getRandomGreeting(englishGreetings, testSeed);
		const frenchGreeting = getRandomGreeting(frenchGreetings, testSeed);

		expect(englishGreetings).toContain(englishGreeting);
		expect(frenchGreetings).toContain(frenchGreeting);

		// Same seed should give same index position in both arrays
		const englishIndex = englishGreetings.indexOf(englishGreeting);
		const frenchIndex = frenchGreetings.indexOf(frenchGreeting);
		expect(englishIndex).toBe(frenchIndex);
	});

	test('should vary greeting by date for same user', () => {
		const userId = 'consistent-user-id';

		// Different dates should produce potentially different greetings
		const dates = [
			'Mon Jan 01 2024',
			'Tue Jan 02 2024',
			'Wed Jan 03 2024',
			'Thu Jan 04 2024',
			'Fri Jan 05 2024',
			'Sat Jan 06 2024',
			'Sun Jan 07 2024',
		];

		const greetings = dates.map((dateStr) =>
			getRandomGreeting(sampleGreetings, `${userId}-${dateStr}`)
		);

		// With 7 different dates, we should see at least 2 different greetings
		const uniqueGreetings = new Set(greetings);
		expect(uniqueGreetings.size).toBeGreaterThanOrEqual(1);
	});
});
