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
                select: { role: true, language: true, position: true, firstName: true, lastName: true, applications: true, phoneNumber: true, profilePhoto: true },
            });
            const base = session as unknown as BetterAuthSession;
            const mergedUser: BetterAuthSession['user'] = {
                ...base.user,
                ...(dbUser ?? {}),
            } as BetterAuthSession['user'];
            return { user: mergedUser, session: base.session } satisfies BetterAuthSession;
        } catch (e) {
            console.error('Error hydrating session user from DB:', e);
            return session as unknown as BetterAuthSession;
        }
	} catch (error: unknown) {
		console.error('Error getting session:', error);
		return null;
	}
}
