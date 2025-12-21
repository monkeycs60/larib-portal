import { redirect } from 'next/navigation';
import { getTypedSession } from './auth-helpers';
import { BetterAuthSession } from '@/types/session';
import { getLocale } from 'next-intl/server';
import { getUserAccountStatus } from './services/users';

/**
 * Authentication guard for protected pages
 * Redirects to login if user is not authenticated
 * Redirects to /access-expired if user account is inactive (departure date passed)
 * Returns the session if authenticated
 */
export async function requireAuth(): Promise<BetterAuthSession> {
  const session = await getTypedSession();
  const locale = await getLocale();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const accountStatus = await getUserAccountStatus(session.user.id);
  if (accountStatus === 'INACTIVE') {
    redirect(`/${locale}/access-expired`);
  }

  return session;
}

/**
 * Helper for public pages (like login)
 * Redirects authenticated users to home page
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getTypedSession();
  console.log('session', session);
  
  if (session) {
    const locale = await getLocale();
    redirect(`/${locale}/dashboard`);
  }
}

/**
 * Optional authentication check
 * Returns session if available, null otherwise
 * Does not redirect
 */
export async function getOptionalAuth(): Promise<BetterAuthSession | null> {
  return await getTypedSession();
}