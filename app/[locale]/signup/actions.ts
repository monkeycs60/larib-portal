'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { unauthenticatedAction } from '@/actions/safe-action';
import { getTranslations } from 'next-intl/server';

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
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      });

      console.log('result', result);

      if ('error' in result && result.error) {
        console.log('result.error', result.error);
        return {
          success: false,
          error: result.error.message || t('authenticationFailed'),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: t('authenticationFailed'),
      };
    }
  });