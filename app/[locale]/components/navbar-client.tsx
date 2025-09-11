'use client';

import { Link, useRouter } from '@/app/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuLabel,
	DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { applicationLink } from '@/lib/application-link';
import Image from 'next/image';

type NavbarUser = {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    profilePhoto?: string | null;
    position?: string | null;
    role?: 'ADMIN' | 'USER';
    firstName?: string | null;
    lastName?: string | null;
    applications?: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'> | null;
};

export function NavbarClient({ user }: { user?: NavbarUser | null }) {
	const t = useTranslations('navigation');
	const tAdmin = useTranslations('admin');
	const locale = useLocale();
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	// edit handled on dedicated profile page

	const displayName = useMemo(() => {
		if (!user) return '';
		return user.firstName ?? user.name ?? user.email;
	}, [user]);

	const initials = useMemo(() => {
		if (!user) return '';
		const pick = (s: string) => (s?.trim()?.charAt(0) ?? '').toUpperCase();
		const first = user.firstName ?? user.name ?? user.email;
		const last = user.lastName ?? '';
		return `${pick(first)}${pick(last)}` || pick(user.email);
	}, [user]);

    const toggleLanguage = () => {
        const newLocale = locale === 'en' ? 'fr' : 'en';
        const currentPath = window.location.pathname.replace(`/${locale}`, '');
        router.push(currentPath || '/', { locale: newLocale });
    };

    const avatarSrc = (user?.profilePhoto ?? user?.image ?? undefined) as string | undefined;

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await authClient.signOut();
			// After auth state change, force RSC re-fetch and navigate with locale
			router.push(applicationLink(locale, '/'));
			router.refresh();
		} catch (e: unknown) {
			console.error(e);
			// noop; safe UI
		} finally {
			setIsLoggingOut(false);
		}
	};

	return (
		<nav className='sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
			<div className='container mx-auto flex h-20 items-center justify-between px-4'>
				<div className='flex items-center'>
					<Link
						href={applicationLink(locale, '/')}
						title='Larib Portal Home'
						className='inline-flex items-center'>
						<Image
							src='/logo-app.png'
							alt='Larib Portal logo'
							width={90}
							height={90}
							className='rounded'
						/>
					</Link>
				</div>

				<div className='flex items-center gap-2 md:gap-3'>
					{/* language toggle comes first */}

					<Button
						variant='outline'
						size='sm'
						onClick={toggleLanguage}
						title={
							locale === 'en' ? 'Switch to French' : 'Passer en anglais'
						}>
						{locale === 'en' ? 'EN' : 'FR'}
					</Button>

					{user ? (
						<>
							<DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    aria-label='Account menu'
                                    className='group inline-flex items-center rounded-full p-[2px] focus:outline-none cursor-pointer transition-colors hover:bg-[linear-gradient(135deg,#6366f1,#06b6d4)]'>
                                    <div className='rounded-full bg-white'>
                                        <Avatar className='size-9 rounded-full border border-gray-200 text-white transition-colors group-hover:border-transparent'>
                                            <AvatarImage src={avatarSrc} alt={displayName} />
                                            <AvatarFallback className='bg-[#0a0a1a] text-white font-semibold'>
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
								<DropdownMenuContent align='end' className='w-72'>
                                <DropdownMenuLabel className='flex items-start gap-3 py-2'>
                                    <div className='rounded-full p-[2px] bg-[linear-gradient(135deg,#6366f1,#06b6d4)]'>
                                        <div className='rounded-full bg-white'>
                                            <Avatar className='size-10 rounded-full border border-gray-200 text-white'>
                                                <AvatarImage src={avatarSrc} alt={displayName} />
                                                <AvatarFallback className='bg-[#0a0a1a] text-white font-semibold'>
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </div>
                                    <div className='min-w-0'>
                                        <div className='truncate font-medium'>
                                            {displayName}
                                        </div>
                                        <div className='truncate text-xs text-gray-500'>
												{user.email}
											</div>
											<div className='mt-1 flex flex-wrap items-center gap-1'>
												{user.role === 'ADMIN' && (
													<Badge
														variant='default'
														className='text-[10px]'>
														{tAdmin('roleAdmin')}
													</Badge>
												)}
												{user.position && (
													<Badge
														variant='secondary'
														className='text-[10px]'>
														{user.position}
													</Badge>
												)}
											</div>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
                                <DropdownMenuItem asChild>
                                    {/* Use i18n Link without locale prefix to avoid double /{locale} */}
                                    <Link href='/profile'>
                                        {t('profile')}
                                    </Link>
                                </DropdownMenuItem>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									{(user.applications ?? []).length > 0 && (
										<>
											<DropdownMenuLabel className='text-xs text-gray-500'>
												{t('applications')}
											</DropdownMenuLabel>
											{(user.applications ?? []).map((app) => {
												const slug =
													app === 'BESTOF_LARIB'
														? '/bestof-larib'
														: app === 'CONGES'
														? '/conges'
														: '/cardiolarib';
												return (
													<DropdownMenuItem key={app} asChild>
														<Link
															href={applicationLink(
																locale,
																slug
															)}>
															{tAdmin(`app_${app}`)}
														</Link>
													</DropdownMenuItem>
												);
											})}
											<DropdownMenuSeparator />
										</>
									)}
									<DropdownMenuItem
										onSelect={handleLogout}
										disabled={isLoggingOut}>
										<LogOut className='mr-2 size-4' />{' '}
										{isLoggingOut ? t('loggingOut') : t('logout')}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					) : (
						<div className='flex items-center gap-2'>
							<Link href='/login'>
								<Button variant='outline' size='sm'>
									{t('login')}
								</Button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</nav>
	);
}
