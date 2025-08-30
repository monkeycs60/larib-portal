'use server';

import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { unauthenticatedAction } from './safe-action';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
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

      redirect('/profile');
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: t('invalidCredentials'),
      };
    }
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

      redirect('/profile');
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: t('authenticationFailed'),
      };
    }
  });