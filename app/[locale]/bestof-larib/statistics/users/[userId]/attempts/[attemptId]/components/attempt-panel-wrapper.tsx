"use client"

import CaseInteractionPanel from '@/app/[locale]/bestof-larib/[id]/user-panel';
import { useRouter } from '@/app/i18n/navigation';

type AttemptPanelWrapperProps = {
  userId: string;
  caseId: string;
  createdAt: string | Date;
  tags: string[];
  comments: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | '';
  userTags: { id: string; name: string; color: string; description: string | null }[];
  userTagIds: string[];
  attempts: Array<{
    id: string;
    createdAt: string | Date;
    validatedAt: string | Date | null;
    lvef: string | null;
    kinetic: string | null;
    lgePresent: boolean | null;
    lgeDetails: string | null;
    finalDx: string | null;
    report: string | null;
  }>;
};

export default function AttemptPanelWrapper({
  userId,
  caseId,
  createdAt,
  tags,
  comments,
  difficulty,
  userTags,
  userTagIds,
  attempts,
}: AttemptPanelWrapperProps) {
  const router = useRouter();

  return (
    <CaseInteractionPanel
      config={{
        isAdmin: true,
        defaultTags: [],
        createdAt,
        caseId,
        tags,
        comments,
        difficulty,
        userTags,
        userTagIds,
        hideActions: true,
        attempts,
        onSelectAttempt: (attempt) => {
          router.push(`/bestof-larib/statistics/users/${userId}/attempts/${attempt.id}`);
        },
      }}
    />
  );
}
