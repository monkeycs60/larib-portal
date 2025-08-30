'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useLocale } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Eye, EyeOff } from 'lucide-react';
import { signupAction } from '../actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function SignupForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formSchema = z.object({
    name: z.string().min(2, t('nameMinLength')),
    email: z.string().email(t('invalidEmail')),
    password: z.string().min(6, t('passwordMinLength')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });

  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const { execute: executeSignup, isExecuting } = useAction(signupAction, {
    onError: ({ error }) => {
      if (error.serverError) {
        setError('root', { message: error.serverError });
      } else {
        setError('root', { message: t('authenticationFailed') });
      }
    },
    onSuccess: ({ data }) => {
      if (data?.success) {
        router.push(`/${locale}/dashboard`);
      }
    },
  });

  const handleSignup = async (data: FormData) => {
    await executeSignup({
      name: data.name,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center space-y-4">
          <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('welcomeToTeam')}</CardTitle>
            <p className="text-muted-foreground mt-2">
              {t('invitedByMessage')}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Your Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-700">{t('yourInformation')}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">{t('name')}</p>
                <p>John Doe</p>
              </div>
              <div>
                <p className="text-gray-600">{t('email')}</p>
                <p>john.doe@company.com</p>
              </div>
              <div>
                <p className="text-gray-600">{t('role')}</p>
                <p>Software Engineer</p>
              </div>
              <div>
                <p className="text-gray-600">{t('department')}</p>
                <p>Engineering</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(handleSignup)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                type="text"
                {...register('name')}
                placeholder={t('namePlaceholder')}
                disabled={isExecuting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder={t('emailPlaceholder')}
                disabled={isExecuting}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('createPassword')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder={t('createPasswordPlaceholder')}
                  disabled={isExecuting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowPassword(prev => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder={t('confirmPasswordPlaceholder')}
                  disabled={isExecuting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{t('passwordRequirements')}</p>
            </div>

            {errors.root && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {errors.root.message}
              </div>
            )}

            <Button type="submit" disabled={isExecuting} className="w-full py-6 bg-gray-900 hover:bg-gray-800">
              {isExecuting ? t('loading') : t('createAccount')}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('alreadyHaveAccount')}{' '}
              <Link href={`/${locale}/login`} className="font-medium text-primary hover:underline">
                {t('signIn')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}