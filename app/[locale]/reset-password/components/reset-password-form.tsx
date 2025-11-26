'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, KeyRound, Eye, EyeOff, CheckCircle, ArrowLeft, XCircle } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { applicationLink } from '@/lib/application-link';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formSchema = z.object({
    password: z.string().min(8, t('passwordRequirements')),
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
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  if (errorParam === 'INVALID_TOKEN' || !token) {
    return (
      <div className="max-w-md mx-auto w-full">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('invalidTokenTitle')}</CardTitle>
              <p className="text-muted-foreground mt-2">
                {t('invalidTokenDescription')}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href={applicationLink(locale, '/forgot-password')}>
              <Button className="w-full">
                {t('requestNewLink')}
              </Button>
            </Link>
            <Link href={applicationLink(locale, '/login')}>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleResetPassword = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: data.password,
      token,
    });

    setIsLoading(false);

    if (resetError) {
      setError(t('resetPasswordError'));
      return;
    }

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto w-full">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('passwordResetSuccess')}</CardTitle>
              <p className="text-muted-foreground mt-2">
                {t('passwordResetSuccessDescription')}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={applicationLink(locale, '/login')}>
              <Button className="w-full">
                {t('signIn')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full">
      <Card>
        <CardHeader className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('resetPasswordTitle')}</CardTitle>
            <p className="text-muted-foreground mt-2">
              {t('resetPasswordDescription')}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('newPassword')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder={t('newPasswordPlaceholder')}
                  disabled={isLoading}
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
                  disabled={isLoading}
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

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full py-6">
              {isLoading ? t('loading') : t('resetPassword')}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href={applicationLink(locale, '/login')}
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
