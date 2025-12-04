"use client"

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import RichTextEditor from '@/components/ui/rich-text-editor';
import PdfViewer from '@/app/[locale]/bestof-larib/[id]/components/pdf-viewer';
import { useTranslations } from 'next-intl';

type AttemptReviewFormProps = {
  attempt: {
    id: string;
    lvef: string | null;
    kinetic: string | null;
    lgePresent: boolean | null;
    lgeDetails: string | null;
    finalDx: string | null;
    report: string | null;
    c: {
      id: string;
      name: string;
      pdfUrl: string | null;
      textContent: string | null;
    };
  };
};

export default function AttemptReviewForm({ attempt }: AttemptReviewFormProps) {
  const t = useTranslations('bestof');

  return (
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-4'>
        <section className='rounded border p-4'>
          <div className='font-medium mb-3'>{t('caseView.myAnalysis')}</div>
          <div className='grid gap-3'>
            <div className='grid grid-cols-[180px_1fr] items-center gap-2'>
              <Label>{t('caseView.analysis.lvef')}</Label>
              <Input value={attempt.lvef ?? ''} disabled />
            </div>
            <div className='grid grid-cols-[180px_1fr] items-center gap-2'>
              <Label>{t('caseView.analysis.kinetic')}</Label>
              <Input value={attempt.kinetic ?? ''} disabled />
            </div>
            <div className='grid grid-cols-[180px_1fr] items-center gap-2'>
              <Label htmlFor='lge-switch'>{t('caseView.analysis.lgePresent')}</Label>
              <Switch id='lge-switch' checked={attempt.lgePresent ?? false} disabled />
            </div>
            {attempt.lgePresent && (
              <div className='grid grid-cols-[180px_1fr] items-center gap-2'>
                <Label>{t('caseView.analysis.lgeDetails')}</Label>
                <Input value={attempt.lgeDetails ?? ''} disabled />
              </div>
            )}
            <div className='grid grid-cols-[180px_1fr] items-center gap-2'>
              <Label>{t('caseView.analysis.finalDx')}</Label>
              <Input value={attempt.finalDx ?? ''} disabled />
            </div>
          </div>
        </section>

        <section className='rounded border p-4'>
          <div className='font-medium mb-3'>{t('caseView.myClinicalReport')}</div>
          <RichTextEditor value={attempt.report ?? ''} disabled />
        </section>
      </div>

      <div className='rounded border p-4 h-fit sticky top-6'>
        <div className='text-sm font-medium mb-2'>{t('content.section')}</div>
        {attempt.c.pdfUrl ? (
          <PdfViewer pdfUrl={attempt.c.pdfUrl} isAdmin={true} className='w-full h-[70vh] rounded border' />
        ) : (
          <div className='rte text-sm' dangerouslySetInnerHTML={{ __html: attempt.c.textContent || '' }} />
        )}
      </div>
    </div>
  );
}
