"use client";
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { deleteCaseAction } from '../actions';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function DeleteCaseButton({ id }: { id: string }) {
  const t = useTranslations('bestof');
  const { execute, isExecuting } = useAction(deleteCaseAction, {
    onSuccess() {
      toast.success(t('deleted'));
      window.location.reload();
    },
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={isExecuting}
      onClick={() => {
        const ok = window.confirm(t('confirmDelete'));
        if (!ok) return;
        void execute({ id });
      }}
    >
      <Trash2 />{t('delete')}
    </Button>
  );
}

