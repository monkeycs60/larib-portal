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
			<div className='min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded'>
				<div className='max-w-md text-center p-6 space-y-3'>
					<div className='text-4xl mb-4'>🔒</div>
					<p className='text-slate-700 font-medium text-lg'>
						{t('contentHiddenBeforeValidation')}
					</p>
				</div>
			</div>
		)
	}

	if (!isRevealed) {
		return (
			<div className='min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 rounded'>
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
		)
	}

	return <>{children}</>
}
