'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useLocale } from 'next-intl';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { applicationLink } from '@/lib/application-link';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const formSchema = z.object({
    email: z.string().email(t('invalidEmail')),
  });

  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const handleForgotPassword = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    const { error: resetError } = await authClient.forgetPassword({
      email: data.email,
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
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
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('emailSent')}</CardTitle>
              <p className="text-muted-foreground mt-2">
                {t('emailSentDescription')}
              </p>
            </div>
          </CardHeader>
          <CardContent>
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

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('forgotPasswordTitle')}</CardTitle>
            <p className="text-muted-foreground mt-2">
              {t('forgotPasswordDescription')}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(handleForgotPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder={t('emailPlaceholder')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full py-6">
              {isLoading ? t('loading') : t('sendResetLink')}
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
