"use client"

import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from '@/app/i18n/navigation'
import { useTranslations } from 'next-intl'

export default function BackButton() {
    const router = useRouter()
    const t = useTranslations('bestof')

    return (
        <Badge
            variant='outline'
            className='cursor-pointer'
            onClick={() => router.back()}
        >
            <ArrowLeft className='mr-1' /> {t('back')}
        </Badge>
    )
}