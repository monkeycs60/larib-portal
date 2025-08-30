import { Session } from '@/app/generated/prisma';
import { User } from '@/app/generated/prisma';

export type BetterAuthSession = {
	user: User;
	session: Session;
};
