'use server';

import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { unauthenticatedAction } from '@/actions/safe-action';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export const signupAction = unauthenticatedAction
  .inputSchema(signupSchema)
  .action(async ({ parsedInput: { email, password, name } }) => {
    const t = await getTranslations('auth');
    
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if ('error' in result && result.error) {
        return {
          success: false,
          error: result.error.message || t('authenticationFailed'),
        };
      }

      const locale = await getLocale();
      redirect(`/${locale}/dashboard`);
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: t('authenticationFailed'),
      };
    }
  });