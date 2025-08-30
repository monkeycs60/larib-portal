'use server';

import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { unauthenticatedAction } from '@/actions/safe-action';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginAction = unauthenticatedAction
  .inputSchema(loginSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    const t = await getTranslations('auth');
    
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if ('error' in result && result.error) {
        return {
          success: false,
          error: t('invalidCredentials'),
        };
      }

      const locale = await getLocale();
      redirect(`/${locale}/dashboard`);
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: t('invalidCredentials'),
      };
    }
  });