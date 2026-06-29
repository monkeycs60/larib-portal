"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { EyeIcon } from 'lucide-react'

type CaseContentDisplayProps = {
	children: React.ReactNode
	isLocked: boolean
	revealKey: number
	isAdmin: boolean
}

export default function CaseContentDisplay({ children, isLocked, revealKey, isAdmin }: CaseContentDisplayProps) {
	const t = useTranslations('bestof.caseView')
	const [isRevealed, setIsRevealed] = useState(false)

	useEffect(() => {
		setIsRevealed(false)
	}, [revealKey])

	if (isAdmin) {
		return <>{children}</>
	}

	if (!isLocked) {
		return (
			<div className='min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded'>
				<div className='max-w-md text-center p-6 space-y-3'>
					<div className='text-4xl mb-4'>🔒</div>
					<p className='text-text-secondary font-medium text-lg'>
						{t('contentHiddenBeforeValidation')}
					</p>
				</div>
			</div>
		)
	}

	if (!isRevealed) {
		return (
			<div className='min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-success-50 to-success-100 rounded'>
				<div className='max-w-md text-center p-6 space-y-4'>
					<div className='text-4xl mb-4'>✅</div>
					<p className='text-success-700 font-semibold text-xl'>
						{t('revealContent')}
					</p>
					<Button
						onClick={() => setIsRevealed(true)}
						size='lg'
						className='mt-4 bg-success-600 hover:bg-success-700'
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
