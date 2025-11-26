import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { redirectIfAuthenticated } from '@/lib/auth-guard';
import { ResetPasswordForm } from './components/reset-password-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ResetPasswordSkeletonProps {
  heading: string;
  description: string;
  loadingLabel: string;
}

function ResetPasswordSkeleton({ heading, description, loadingLabel }: ResetPasswordSkeletonProps) {
  return (
    <div className="max-w-md mx-auto w-full">
      <Card>
        <CardHeader className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <div>
            <CardTitle className="text-xl">{heading}</CardTitle>
            <p className="text-muted-foreground mt-2">{description}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="relative">
            <Skeleton className="h-12 w-full" />
            <span className="sr-only">{loadingLabel}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ResetPasswordPage() {
  await redirectIfAuthenticated();
  const translations = await getTranslations('auth');

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={(
          <ResetPasswordSkeleton
            heading={translations('resetPasswordTitle')}
            description={translations('resetPasswordDescription')}
            loadingLabel={translations('loading')}
          />
        )}
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
