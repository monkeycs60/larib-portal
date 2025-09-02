import { auth } from './auth';
import { headers } from 'next/headers';
import { BetterAuthSession } from '@/types/session';
import { prisma } from '@/lib/prisma';

export async function getTypedSession(): Promise<BetterAuthSession | null> {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		// Return null if no session or invalid session
		if (!session || !session.user) {
			return null;
		}


		// Ensure role (and other DB-backed fields) are present on the user
		try {
			const dbUser = await prisma.user.findUnique({
				where: { id: session.user.id },
				select: { role: true, language: true },
			});
			if (dbUser) {
				(session.user as any).role = dbUser.role;
				(session.user as any).language = dbUser.language;
			}
		} catch (e) {
			console.error('Error hydrating session user from DB:', e);
		}

		return session as BetterAuthSession;
	} catch (error: unknown) {
		console.error('Error getting session:', error);
		return null;
	}
}
