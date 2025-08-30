'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { unauthenticatedAction } from '@/actions/safe-action';
import { getTranslations } from 'next-intl/server';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginAction = unauthenticatedAction
  .inputSchema(loginSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    const t = await getTranslations('auth');
    
    try {
      const result = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });

      if ('error' in result && result.error) {
        return {
          success: false,
          error: t('invalidCredentials'),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: t('invalidCredentials'),
      };
    }
  });