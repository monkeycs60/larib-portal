"use client";
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { deleteCaseAction } from '../actions';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive" disabled={isExecuting}>
          <Trash2 />{t('delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => execute({ id })}>
            {isExecuting ? t('deleting') : t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
