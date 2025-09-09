import { getOptionalAuth } from '@/lib/auth-guard';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/app/i18n/navigation';
import { LoginForm } from '@/app/[locale]/login/components/login-form';

export default async function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
    // Optional authentication - no redirect yet
    const session = await getOptionalAuth();

    const { locale } = await params;
    // If authenticated, send to dashboard by default
    if (session) {
        redirect({ href: '/dashboard', locale });
    }

    // Unauthenticated: render login directly as the home page
    await getTranslations({ locale, namespace: 'auth' }); // ensure messages are loaded
    return (
        <div className='min-h-screen flex items-center justify-center py-12 px-4'>
            <LoginForm showSignupLink={false} />
        </div>
    );
}
