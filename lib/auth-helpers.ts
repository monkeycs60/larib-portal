import { auth } from './auth';
import { headers } from 'next/headers';
import { BetterAuthSession } from '@/types/session';

export async function getTypedSession(): Promise<BetterAuthSession | null> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return session as BetterAuthSession;
}
