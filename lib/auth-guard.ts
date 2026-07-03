import { redirect, notFound } from 'next/navigation';
import { getTypedSession } from './auth-helpers';
import { BetterAuthSession } from '@/types/session';
import { getLocale } from 'next-intl/server';
import type { Application } from '@/app/generated/prisma';
import { canAdminApp, isSuperAdmin } from './permissions';

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

/**
 * Guard for portal-wide super-admin pages
 * Requires authentication, then returns 404 if the user is not a super admin
 */
export async function requireSuperAdmin(): Promise<BetterAuthSession> {
  const session = await requireAuth();
  if (!isSuperAdmin(session.user)) {
    notFound();
  }
  return session;
}

/**
 * Guard for per-app admin pages
 * Requires authentication, then redirects to the dashboard if the user cannot admin the given app
 */
export async function requireAppAdmin(app: Application): Promise<BetterAuthSession> {
  const session = await requireAuth();
  if (!canAdminApp(session.user, app)) {
    const locale = await getLocale();
    redirect(`/${locale}/dashboard`);
  }
  return session;
}