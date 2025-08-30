import { auth } from './auth';
import { headers } from 'next/headers';
import { BetterAuthSession } from '@/types/session';

export async function getTypedSession(): Promise<BetterAuthSession | null> {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		// Return null if no session or invalid session
		if (!session || !session.user) {
			return null;
		}

		return session as BetterAuthSession;
	} catch (error: unknown) {
		console.error('Error getting session:', error);
		return null;
	}
}
