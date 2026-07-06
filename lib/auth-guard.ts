import { redirect } from 'next/navigation';
import { getTypedSession } from './auth-helpers';
import { BetterAuthSession } from '@/types/session';
import { getLocale } from 'next-intl/server';

/**
 * Authentication guard for protected pages
 * Redirects to login if user is not authenticated
 * Returns the session if authenticated
 */
export async function requireAuth(): Promise<BetterAuthSession> {
  const session = await getTypedSession();
  
  if (!session) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
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