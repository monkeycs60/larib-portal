import { redirectIfAuthenticated } from '@/lib/auth-guard';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage() {
  // Redirect to home if user is already authenticated
  await redirectIfAuthenticated();
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}