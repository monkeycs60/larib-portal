import { getTypedSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getTypedSession();
  
  // If user is already authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}