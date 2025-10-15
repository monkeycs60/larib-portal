"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { EyeIcon } from 'lucide-react'

type CaseContentDisplayProps = {
	children: React.ReactNode
	isLocked: boolean
	revealKey: number
}

export default function CaseContentDisplay({ children, isLocked, revealKey }: CaseContentDisplayProps) {
	const t = useTranslations('bestof.caseView')
	const [isRevealed, setIsRevealed] = useState(false)

	useEffect(() => {
		setIsRevealed(false)
	}, [revealKey])

	if (!isLocked) {
		return (
			<div className='relative'>
				<div className='absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-100/95 to-slate-200/95 backdrop-blur-sm rounded border border-slate-300'>
					<div className='max-w-md text-center p-6 space-y-3'>
						<div className='text-4xl mb-4'>🔒</div>
						<p className='text-slate-700 font-medium text-lg'>
							{t('contentHiddenBeforeValidation')}
						</p>
					</div>
				</div>
				<div className='blur-md pointer-events-none select-none'>
					{children}
				</div>
			</div>
		)
	}

	if (!isRevealed) {
		return (
			<div className='relative'>
				<div className='absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-emerald-50/95 to-emerald-100/95 backdrop-blur-sm rounded border border-emerald-300'>
					<div className='max-w-md text-center p-6 space-y-4'>
						<div className='text-4xl mb-4'>✅</div>
						<p className='text-emerald-900 font-semibold text-xl'>
							{t('revealContent')}
						</p>
						<Button
							onClick={() => setIsRevealed(true)}
							size='lg'
							className='mt-4 bg-emerald-600 hover:bg-emerald-700'
						>
							<EyeIcon className='w-5 h-5 mr-2' />
							{t('clickToReveal')}
						</Button>
					</div>
				</div>
				<div className='blur-md pointer-events-none select-none'>
					{children}
				</div>
			</div>
		)
	}

	return <>{children}</>
}
