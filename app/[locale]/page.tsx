import { getOptionalAuth } from '@/lib/auth-guard';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	// Optional authentication - no redirect, just check if user is logged in
	const session = await getOptionalAuth();

	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'home' });

	if (!session) {
		// User not logged in - show public homepage
		return (
			<div className='min-h-screen flex items-center justify-center py-12 px-4'>
				<div className='max-w-md mx-auto text-center'>
					<h1 className='text-4xl font-bold text-gray-900 mb-4'>
						{t('welcomeToApp')}
					</h1>
					<p className='text-gray-600 mb-8'>{t('appDescription')}</p>
					<div className='space-y-4'>
						<Link
							href={`/${locale}/login`}
							className='block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors'>
							{t('signIn')}
						</Link>
						<Link
							href={`/${locale}/signup`}
							className='block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors'>
							{t('signUp')}
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// User logged in - show welcome message with link to dashboard
	return (
		<div className='min-h-screen p-8'>
			<div className='max-w-4xl mx-auto'>
				<header className='mb-8'>
					<h1 className='text-3xl font-bold text-gray-900'>
						{t('welcome')}, {session.user.name || session.user.email}!
					</h1>
					<p className='text-gray-600 mt-2'>{t('welcomeMessage')}</p>
				</header>

				<main>
					<div className='bg-white p-6 rounded-lg shadow'>
						<h2 className='text-xl font-semibold mb-4'>
							{t('whatToDo')}
						</h2>
						<div className='space-y-4'>
							<Link
								href='/dashboard'
								className='block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center'>
								{t('goToDashboard')}
							</Link>
							<Link
								href='/profile'
								className='block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors text-center'>
								{t('goToProfile')}
							</Link>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
