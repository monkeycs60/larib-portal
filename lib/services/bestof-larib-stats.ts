import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CASES_TAG } from './bestof-larib';

export const STATS_TAG = 'bestof:stats';

export type StatsFilters = {
  userIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  examTypeIds?: string[];
  diseaseTagIds?: string[];
  difficulties?: Array<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>;
  adminTagIds?: string[];
};

export type UserStatistics = {
  userId: string;
  userName: string;
  userEmail: string;
  totalCompleted: number;
  completedByDifficulty: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  completedByExamType: Record<string, { count: number; name: string }>;
  completedByDisease: Record<string, { count: number; name: string }>;
  completedByAdminTag: Record<string, { count: number; name: string; color: string }>;
  lastCompletedAt: Date | null;
  daysSinceLastActivity: number | null;
  regularityPerWeek: number;
  firstCompletedAt: Date | null;
};

export type GlobalStatistics = {
  totalCasesCompleted: number;
  totalUniqueUsers: number;
  averageCasesPerUser: number;
  mostPracticedCase: {
    id: string;
    name: string;
    completionCount: number;
  } | null;
  activitiesLast30Days: {
    date: string;
    count: number;
  }[];
};

export type CaseCompletionTrend = {
  period: string;
  count: number;
  userId?: string;
};

type BuildWhereClauseParams = {
  filters?: StatsFilters;
  userId?: string;
};

const buildAttemptWhereClause = ({ filters }: BuildWhereClauseParams) => {
  const baseWhere = {
    validatedAt: { not: null },
    ...(filters?.dateFrom || filters?.dateTo
      ? {
          validatedAt: {
            not: null,
            gte: filters?.dateFrom,
            lte: filters?.dateTo,
          },
        }
      : {}),
    ...(filters?.userIds?.length ? { userId: { in: filters.userIds } } : {}),
  };

  if (!filters?.examTypeIds?.length && !filters?.diseaseTagIds?.length && !filters?.difficulties?.length && !filters?.adminTagIds?.length) {
    return baseWhere;
  }

  return {
    ...baseWhere,
    c: {
      ...(filters?.examTypeIds?.length ? { examTypeId: { in: filters.examTypeIds } } : {}),
      ...(filters?.diseaseTagIds?.length ? { diseaseTagId: { in: filters.diseaseTagIds } } : {}),
      ...(filters?.difficulties?.length ? { difficulty: { in: filters.difficulties } } : {}),
      ...(filters?.adminTagIds?.length ? { adminTags: { some: { tagId: { in: filters.adminTagIds } } } } : {}),
    },
  };
};

const fetchUserStatisticsData = async (filters?: StatsFilters) => {
  const where = buildAttemptWhereClause({ filters });

  const attempts = await prisma.caseAttempt.findMany({
    where,
    select: {
      id: true,
      userId: true,
      caseId: true,
      validatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      c: {
        select: {
          id: true,
          name: true,
          difficulty: true,
          examType: {
            select: { id: true, name: true },
          },
          diseaseTag: {
            select: { id: true, name: true },
          },
          adminTags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
      },
    },
    orderBy: { validatedAt: 'desc' },
  });

  const userMap = new Map<string, UserStatistics>();

  for (const attempt of attempts) {
    if (!attempt.validatedAt) continue;

    const userId = attempt.userId;
    const existing = userMap.get(userId);

    const displayName = attempt.user.firstName
      ? `${attempt.user.firstName} ${attempt.user.lastName || ''}`.trim()
      : attempt.user.name || attempt.user.email;

    if (!existing) {
      userMap.set(userId, {
        userId,
        userName: displayName,
        userEmail: attempt.user.email,
        totalCompleted: 1,
        completedByDifficulty: {
          beginner: attempt.c.difficulty === 'BEGINNER' ? 1 : 0,
          intermediate: attempt.c.difficulty === 'INTERMEDIATE' ? 1 : 0,
          advanced: attempt.c.difficulty === 'ADVANCED' ? 1 : 0,
        },
        completedByExamType: attempt.c.examType
          ? {
              [attempt.c.examType.id]: {
                count: 1,
                name: attempt.c.examType.name,
              },
            }
          : {},
        completedByDisease: attempt.c.diseaseTag
          ? {
              [attempt.c.diseaseTag.id]: {
                count: 1,
                name: attempt.c.diseaseTag.name,
              },
            }
          : {},
        completedByAdminTag: attempt.c.adminTags.reduce<Record<string, { count: number; name: string; color: string }>>(
          (accumulator, adminTagOnCase) => {
            accumulator[adminTagOnCase.tag.id] = {
              count: 1,
              name: adminTagOnCase.tag.name,
              color: adminTagOnCase.tag.color,
            };
            return accumulator;
          },
          {},
        ),
        lastCompletedAt: attempt.validatedAt,
        daysSinceLastActivity: Math.floor((Date.now() - attempt.validatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        regularityPerWeek: 0,
        firstCompletedAt: attempt.validatedAt,
      });
    } else {
      existing.totalCompleted += 1;

      if (attempt.c.difficulty === 'BEGINNER') existing.completedByDifficulty.beginner += 1;
      else if (attempt.c.difficulty === 'INTERMEDIATE') existing.completedByDifficulty.intermediate += 1;
      else if (attempt.c.difficulty === 'ADVANCED') existing.completedByDifficulty.advanced += 1;

      if (attempt.c.examType) {
        const examTypeId = attempt.c.examType.id;
        if (existing.completedByExamType[examTypeId]) {
          existing.completedByExamType[examTypeId].count += 1;
        } else {
          existing.completedByExamType[examTypeId] = {
            count: 1,
            name: attempt.c.examType.name,
          };
        }
      }

      if (attempt.c.diseaseTag) {
        const diseaseId = attempt.c.diseaseTag.id;
        if (existing.completedByDisease[diseaseId]) {
          existing.completedByDisease[diseaseId].count += 1;
        } else {
          existing.completedByDisease[diseaseId] = {
            count: 1,
            name: attempt.c.diseaseTag.name,
          };
        }
      }

      for (const adminTagOnCase of attempt.c.adminTags) {
        const tagId = adminTagOnCase.tag.id;
        if (existing.completedByAdminTag[tagId]) {
          existing.completedByAdminTag[tagId].count += 1;
        } else {
          existing.completedByAdminTag[tagId] = {
            count: 1,
            name: adminTagOnCase.tag.name,
            color: adminTagOnCase.tag.color,
          };
        }
      }

      if (attempt.validatedAt > (existing.lastCompletedAt || new Date(0))) {
        existing.lastCompletedAt = attempt.validatedAt;
        existing.daysSinceLastActivity = Math.floor((Date.now() - attempt.validatedAt.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (attempt.validatedAt < (existing.firstCompletedAt || new Date())) {
        existing.firstCompletedAt = attempt.validatedAt;
      }
    }
  }

  for (const stats of userMap.values()) {
    if (stats.firstCompletedAt && stats.lastCompletedAt) {
      const daysDiff = Math.max(
        1,
        Math.floor((stats.lastCompletedAt.getTime() - stats.firstCompletedAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const weeksDiff = daysDiff / 7;
      stats.regularityPerWeek = weeksDiff > 0 ? Number((stats.totalCompleted / weeksDiff).toFixed(2)) : 0;
    }
  }

  return Array.from(userMap.values()).sort((a, b) => b.totalCompleted - a.totalCompleted);
};

const cachedUserStatistics = cache(async (filtersJson: string) => {
  const filters = JSON.parse(filtersJson) as StatsFilters | undefined;
  return unstable_cache(
    () => fetchUserStatisticsData(filters),
    ['bestof:stats:users', filtersJson],
    { tags: [STATS_TAG, CASES_TAG] },
  )();
});

export const getUserStatistics = async (filters?: StatsFilters): Promise<UserStatistics[]> => {
  return cachedUserStatistics(JSON.stringify(filters || {}));
};

const fetchGlobalStatisticsData = async (filters?: StatsFilters) => {
  const where = buildAttemptWhereClause({ filters });

  const [attempts, caseCounts] = await Promise.all([
    prisma.caseAttempt.findMany({
      where,
      select: {
        userId: true,
        caseId: true,
        validatedAt: true,
        c: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.caseAttempt.groupBy({
      by: ['caseId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
  ]);

  const uniqueUsers = new Set(attempts.map((attempt) => attempt.userId));
  const totalCompleted = attempts.length;
  const avgPerUser = uniqueUsers.size > 0 ? Number((totalCompleted / uniqueUsers.size).toFixed(2)) : 0;

  let mostPracticedCase = null;
  if (caseCounts.length > 0 && caseCounts[0]._count.id > 0) {
    const topCaseId = caseCounts[0].caseId;
    const topCase = attempts.find((attempt) => attempt.caseId === topCaseId)?.c;
    if (topCase) {
      mostPracticedCase = {
        id: topCase.id,
        name: topCase.name,
        completionCount: caseCounts[0]._count.id,
      };
    }
  }

  const last30DaysDate = new Date();
  last30DaysDate.setDate(last30DaysDate.getDate() - 30);

  const recentAttempts = attempts.filter(
    (attempt) => attempt.validatedAt && attempt.validatedAt >= last30DaysDate,
  );

  const activityByDate = recentAttempts.reduce<Record<string, number>>((accumulator, attempt) => {
    if (!attempt.validatedAt) return accumulator;
    const dateKey = attempt.validatedAt.toISOString().split('T')[0];
    accumulator[dateKey] = (accumulator[dateKey] || 0) + 1;
    return accumulator;
  }, {});

  const activitiesLast30Days = Object.entries(activityByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCasesCompleted: totalCompleted,
    totalUniqueUsers: uniqueUsers.size,
    averageCasesPerUser: avgPerUser,
    mostPracticedCase,
    activitiesLast30Days,
  };
};

const cachedGlobalStatistics = cache(async (filtersJson: string) => {
  const filters = JSON.parse(filtersJson) as StatsFilters | undefined;
  return unstable_cache(
    () => fetchGlobalStatisticsData(filters),
    ['bestof:stats:global', filtersJson],
    { tags: [STATS_TAG, CASES_TAG] },
  )();
});

export const getGlobalStatistics = async (filters?: StatsFilters): Promise<GlobalStatistics> => {
  return cachedGlobalStatistics(JSON.stringify(filters || {}));
};

const fetchCompletionTrendData = async (filters?: StatsFilters, groupBy: 'day' | 'week' | 'month' = 'week') => {
  const where = buildAttemptWhereClause({ filters });

  const attempts = await prisma.caseAttempt.findMany({
    where,
    select: {
      validatedAt: true,
      userId: true,
    },
    orderBy: { validatedAt: 'asc' },
  });

  const trendMap = new Map<string, number>();

  for (const attempt of attempts) {
    if (!attempt.validatedAt) continue;

    let periodKey: string;
    const date = new Date(attempt.validatedAt);

    if (groupBy === 'day') {
      periodKey = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      periodKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      periodKey = `${year}-${month}`;
    }

    trendMap.set(periodKey, (trendMap.get(periodKey) || 0) + 1);
  }

  return Array.from(trendMap.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const cachedCompletionTrend = cache(async (filtersJson: string, groupBy: 'day' | 'week' | 'month') => {
  const filters = JSON.parse(filtersJson) as StatsFilters | undefined;
  return unstable_cache(
    () => fetchCompletionTrendData(filters, groupBy),
    ['bestof:stats:trend', filtersJson, groupBy],
    { tags: [STATS_TAG, CASES_TAG] },
  )();
});

export const getCompletionTrend = async (
  filters?: StatsFilters,
  groupBy: 'day' | 'week' | 'month' = 'week',
): Promise<CaseCompletionTrend[]> => {
  return cachedCompletionTrend(JSON.stringify(filters || {}), groupBy);
};

export const listAllUsersWithAttempts = async (): Promise<Array<{ id: string; name: string; email: string }>> => {
  const users = await prisma.user.findMany({
    where: {
      CaseAttempt: {
        some: {
          validatedAt: { not: null },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { email: 'asc' },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name || user.email,
    email: user.email,
  }));
};
