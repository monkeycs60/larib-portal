import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from './prisma';
import { sendResetPasswordEmail } from './services/email';

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: 'postgresql',
	}),
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			const userRecord = await prisma.user.findUnique({
				where: { id: user.id },
				select: { language: true },
			});
			const locale = userRecord?.language === 'FR' ? 'fr' : 'en';
			await sendResetPasswordEmail({
				to: user.email,
				resetUrl: url,
				locale,
			});
		},
	},
	secret: process.env.BETTER_AUTH_SECRET!,
	baseURL: process.env.NEXT_PUBLIC_APP_URL!,
	plugins: [nextCookies()],
});
