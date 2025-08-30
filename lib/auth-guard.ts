import { redirect } from 'next/navigation';
import { getTypedSession } from './auth-helpers';
import { BetterAuthSession } from '@/types/session';

/**
 * Authentication guard for protected pages
 * Redirects to login if user is not authenticated
 * Returns the session if authenticated
 */
export async function requireAuth(): Promise<BetterAuthSession> {
  const session = await getTypedSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return session;
}

/**
 * Helper for public pages (like login)
 * Redirects authenticated users to home page
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getTypedSession();
  
  if (session) {
    redirect('/dashboard');
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