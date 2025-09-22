'use client';

import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Link, useRouter } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function StartNewAttemptLink({ href, label, children }: { href: string; label: string; children?: ReactNode }) {
  const router = useRouter();
  const prefetchTarget = useCallback(() => {
    void router.prefetch(href);
  }, [router, href]);

  return (
    <Link
      href={href}
      prefetch
      className='inline-flex'
      onPointerEnter={prefetchTarget}
      onFocus={prefetchTarget}
      onTouchStart={prefetchTarget}
    >
      <Button size='sm' variant='outline' className='gap-1'>
        {children}
        {label}
      </Button>
    </Link>
  );
}
