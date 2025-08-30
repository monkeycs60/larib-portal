'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from '@/app/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

export function LoginForm() {
	const t = useTranslations('auth');
	const router = useRouter();
	const searchParams = useSearchParams();
	const mode = searchParams.get('mode');
	const [isLogin, setIsLogin] = useState(mode !== 'signup');
	const [loading, setLoading] = useState(false);

	const formSchema = z.object({
		name: z.string().min(2, t('nameMinLength')).optional(),
		email: z.string().email(t('invalidEmail')),
		password: z.string().min(6, t('passwordMinLength')),
	});

  type FormData = z.infer<typeof formSchema>;

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		reset,
	} = useForm<FormData>({
		resolver: zodResolver(formSchema),
	});

	const onSubmit = async (data: FormData) => {
		setLoading(true);

		try {
			if (isLogin) {
				const result = await authClient.signIn.email({
					email: data.email,
					password: data.password,
				});

				// Check if the result contains an error
				if ('error' in result && result.error) {
					setError('root', { message: t('invalidCredentials') });
					return;
				}

				router.push('/');
			} else {
				if (!data.name) {
					setError('name', { message: t('nameRequired') });
					setLoading(false);
					return;
				}

				const result = await authClient.signUp.email({
					email: data.email,
					password: data.password,
					name: data.name,
				});

				// Check if the result contains an error
				if ('error' in result && result.error) {
					setError('root', {
						message: result.error.message || t('authenticationFailed'),
					});
					return;
				}

				router.push('/');
			}
		} catch (err) {
			console.error('Authentication error:', err);
			// For sign in errors, use translated messages
			const errorMessage = isLogin
				? t('invalidCredentials')
				: t('authenticationFailed');
			setError('root', { message: errorMessage });
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		try {
			await authClient.signIn.social({
				provider: 'google',
			});
		} catch (err) {
			console.error('Google login error:', err);
			const error = err as Error;
			setError('root', { message: error.message || t('googleLoginFailed') });
		}
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		reset();
	};

	return (
		<div className='max-w-md w-full space-y-8'>
			<div>
				<h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
					{isLogin ? t('loginTitle') : t('signupTitle')}
				</h2>
			</div>
			<form className='mt-8 space-y-6' onSubmit={handleSubmit(onSubmit)}>
				<div className='rounded-md shadow-sm -space-y-px'>
					{!isLogin && (
						<div>
							<label htmlFor='name' className='sr-only'>
								{t('name')}
							</label>
							<input
								id='name'
								type='text'
								autoComplete='name'
								{...register('name')}
								className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm'
								placeholder={t('name')}
							/>
							{errors.name && (
								<p className='mt-1 text-xs text-red-600'>
									{errors.name.message}
								</p>
							)}
						</div>
					)}
					<div>
						<label htmlFor='email' className='sr-only'>
							{t('email')}
						</label>
						<input
							id='email'
							type='email'
							autoComplete='email'
							{...register('email')}
							className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${
								isLogin ? 'rounded-t-md' : ''
							} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
							placeholder={t('email')}
						/>
						{errors.email && (
							<p className='mt-1 text-xs text-red-600'>
								{errors.email.message}
							</p>
						)}
					</div>
					<div>
						<label htmlFor='password' className='sr-only'>
							{t('password')}
						</label>
						<input
							id='password'
							type='password'
							autoComplete='current-password'
							{...register('password')}
							className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm'
							placeholder={t('password')}
						/>
						{errors.password && (
							<p className='mt-1 text-xs text-red-600'>
								{errors.password.message}
							</p>
						)}
					</div>
				</div>

				{errors.root && (
					<div className='rounded-md bg-red-50 p-4'>
						<p className='text-sm text-red-800'>{errors.root.message}</p>
					</div>
				)}

				<div>
					<button
						type='submit'
						disabled={loading}
						className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50'>
						{loading
							? t('loading')
							: isLogin
							? t('loginButton')
							: t('signupButton')}
					</button>
				</div>

				<div className='mt-6'>
					<div className='relative'>
						<div className='absolute inset-0 flex items-center'>
							<div className='w-full border-t border-gray-300' />
						</div>
						<div className='relative flex justify-center text-sm'>
							<span className='px-2 bg-gray-50 text-gray-500'>
								{t('orContinueWith')}
							</span>
						</div>
					</div>

					<div className='mt-6'>
						<button
							type='button'
							onClick={handleGoogleLogin}
							className='w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50'>
							<svg className='w-5 h-5' viewBox='0 0 24 24'>
								<path
									fill='currentColor'
									d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
								/>
								<path
									fill='currentColor'
									d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
								/>
								<path
									fill='currentColor'
									d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
								/>
								<path
									fill='currentColor'
									d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
								/>
							</svg>
							<span className='ml-2'>Google</span>
						</button>
					</div>
				</div>

				<div className='text-center'>
					<button
						type='button'
						onClick={toggleMode}
						className='font-medium text-indigo-600 hover:text-indigo-500'>
						{isLogin
							? t('noAccount') + ' ' + t('switchToSignup')
							: t('alreadyHaveAccount') + ' ' + t('switchToLogin')}
					</button>
				</div>
			</form>
		</div>
	);
}
