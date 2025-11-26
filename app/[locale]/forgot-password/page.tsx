import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { redirectIfAuthenticated } from '@/lib/auth-guard';
import { ForgotPasswordForm } from './components/forgot-password-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ForgotPasswordSkeletonProps {
  heading: string;
  description: string;
  loadingLabel: string;
}

function ForgotPasswordSkeleton({ heading, description, loadingLabel }: ForgotPasswordSkeletonProps) {
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
            <Skeleton className="h-4 w-24" />
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

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();
  const translations = await getTranslations('auth');

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={(
          <ForgotPasswordSkeleton
            heading={translations('forgotPasswordTitle')}
            description={translations('forgotPasswordDescription')}
            loadingLabel={translations('loading')}
          />
        )}
      >
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
