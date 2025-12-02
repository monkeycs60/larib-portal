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
  userPosition: string | null;
  uniqueCasesCompleted: number;
  totalAttempts: number;
  completedByDifficulty: {
    beginner: { uniqueCases: number; totalAttempts: number };
    intermediate: { uniqueCases: number; totalAttempts: number };
    advanced: { uniqueCases: number; totalAttempts: number };
  };
  completedByExamType: Record<string, { uniqueCases: number; totalAttempts: number; name: string }>;
  completedByDisease: Record<string, { uniqueCases: number; totalAttempts: number; name: string }>;
  completedByAdminTag: Record<string, { uniqueCases: number; totalAttempts: number; name: string; color: string }>;
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
          position: true,
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

  type UserTracking = {
    uniqueCases: Set<string>;
    totalAttempts: number;
    uniqueCasesByDifficulty: {
      beginner: { cases: Set<string>; attempts: number };
      intermediate: { cases: Set<string>; attempts: number };
      advanced: { cases: Set<string>; attempts: number };
    };
    uniqueCasesByExamType: Map<string, { cases: Set<string>; attempts: number; name: string }>;
    uniqueCasesByDisease: Map<string, { cases: Set<string>; attempts: number; name: string }>;
    uniqueCasesByAdminTag: Map<string, { cases: Set<string>; attempts: number; name: string; color: string }>;
    user: {
      id: string;
      name: string;
      email: string;
      position: string | null;
    };
    lastCompletedAt: Date | null;
    firstCompletedAt: Date | null;
  };

  const userMap = new Map<string, UserTracking>();

  for (const attempt of attempts) {
    if (!attempt.validatedAt) continue;

    const userId = attempt.userId;
    const caseId = attempt.caseId;
    const displayName = attempt.user.firstName
      ? `${attempt.user.firstName} ${attempt.user.lastName || ''}`.trim()
      : attempt.user.name || attempt.user.email;

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        uniqueCases: new Set(),
        totalAttempts: 0,
        uniqueCasesByDifficulty: {
          beginner: { cases: new Set(), attempts: 0 },
          intermediate: { cases: new Set(), attempts: 0 },
          advanced: { cases: new Set(), attempts: 0 },
        },
        uniqueCasesByExamType: new Map(),
        uniqueCasesByDisease: new Map(),
        uniqueCasesByAdminTag: new Map(),
        user: {
          id: userId,
          name: displayName,
          email: attempt.user.email,
          position: attempt.user.position,
        },
        lastCompletedAt: attempt.validatedAt,
        firstCompletedAt: attempt.validatedAt,
      });
    }

    const tracking = userMap.get(userId)!;
    tracking.uniqueCases.add(caseId);
    tracking.totalAttempts += 1;

    if (attempt.c.difficulty === 'BEGINNER') {
      tracking.uniqueCasesByDifficulty.beginner.cases.add(caseId);
      tracking.uniqueCasesByDifficulty.beginner.attempts += 1;
    } else if (attempt.c.difficulty === 'INTERMEDIATE') {
      tracking.uniqueCasesByDifficulty.intermediate.cases.add(caseId);
      tracking.uniqueCasesByDifficulty.intermediate.attempts += 1;
    } else if (attempt.c.difficulty === 'ADVANCED') {
      tracking.uniqueCasesByDifficulty.advanced.cases.add(caseId);
      tracking.uniqueCasesByDifficulty.advanced.attempts += 1;
    }

    if (attempt.c.examType) {
      const examTypeId = attempt.c.examType.id;
      if (!tracking.uniqueCasesByExamType.has(examTypeId)) {
        tracking.uniqueCasesByExamType.set(examTypeId, {
          cases: new Set(),
          attempts: 0,
          name: attempt.c.examType.name,
        });
      }
      const examTypeData = tracking.uniqueCasesByExamType.get(examTypeId)!;
      examTypeData.cases.add(caseId);
      examTypeData.attempts += 1;
    }

    if (attempt.c.diseaseTag) {
      const diseaseId = attempt.c.diseaseTag.id;
      if (!tracking.uniqueCasesByDisease.has(diseaseId)) {
        tracking.uniqueCasesByDisease.set(diseaseId, {
          cases: new Set(),
          attempts: 0,
          name: attempt.c.diseaseTag.name,
        });
      }
      const diseaseData = tracking.uniqueCasesByDisease.get(diseaseId)!;
      diseaseData.cases.add(caseId);
      diseaseData.attempts += 1;
    }

    for (const adminTagOnCase of attempt.c.adminTags) {
      const tagId = adminTagOnCase.tag.id;
      if (!tracking.uniqueCasesByAdminTag.has(tagId)) {
        tracking.uniqueCasesByAdminTag.set(tagId, {
          cases: new Set(),
          attempts: 0,
          name: adminTagOnCase.tag.name,
          color: adminTagOnCase.tag.color,
        });
      }
      const tagData = tracking.uniqueCasesByAdminTag.get(tagId)!;
      tagData.cases.add(caseId);
      tagData.attempts += 1;
    }

    if (attempt.validatedAt > (tracking.lastCompletedAt || new Date(0))) {
      tracking.lastCompletedAt = attempt.validatedAt;
    }

    if (attempt.validatedAt < (tracking.firstCompletedAt || new Date())) {
      tracking.firstCompletedAt = attempt.validatedAt;
    }
  }

  const result: UserStatistics[] = [];

  for (const [userId, tracking] of userMap.entries()) {
    const daysSinceLastActivity = tracking.lastCompletedAt
      ? Math.floor((Date.now() - tracking.lastCompletedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const daysDiff =
      tracking.firstCompletedAt && tracking.lastCompletedAt
        ? Math.max(1, Math.floor((tracking.lastCompletedAt.getTime() - tracking.firstCompletedAt.getTime()) / (1000 * 60 * 60 * 24)))
        : 1;
    const weeksDiff = daysDiff / 7;
    const regularityPerWeek = weeksDiff > 0 ? Number((tracking.uniqueCases.size / weeksDiff).toFixed(2)) : 0;

    const completedByExamType: Record<string, { uniqueCases: number; totalAttempts: number; name: string }> = {};
    for (const [examTypeId, data] of tracking.uniqueCasesByExamType.entries()) {
      completedByExamType[examTypeId] = {
        uniqueCases: data.cases.size,
        totalAttempts: data.attempts,
        name: data.name,
      };
    }

    const completedByDisease: Record<string, { uniqueCases: number; totalAttempts: number; name: string }> = {};
    for (const [diseaseId, data] of tracking.uniqueCasesByDisease.entries()) {
      completedByDisease[diseaseId] = {
        uniqueCases: data.cases.size,
        totalAttempts: data.attempts,
        name: data.name,
      };
    }

    const completedByAdminTag: Record<string, { uniqueCases: number; totalAttempts: number; name: string; color: string }> = {};
    for (const [tagId, data] of tracking.uniqueCasesByAdminTag.entries()) {
      completedByAdminTag[tagId] = {
        uniqueCases: data.cases.size,
        totalAttempts: data.attempts,
        name: data.name,
        color: data.color,
      };
    }

    result.push({
      userId,
      userName: tracking.user.name,
      userEmail: tracking.user.email,
      userPosition: tracking.user.position,
      uniqueCasesCompleted: tracking.uniqueCases.size,
      totalAttempts: tracking.totalAttempts,
      completedByDifficulty: {
        beginner: {
          uniqueCases: tracking.uniqueCasesByDifficulty.beginner.cases.size,
          totalAttempts: tracking.uniqueCasesByDifficulty.beginner.attempts,
        },
        intermediate: {
          uniqueCases: tracking.uniqueCasesByDifficulty.intermediate.cases.size,
          totalAttempts: tracking.uniqueCasesByDifficulty.intermediate.attempts,
        },
        advanced: {
          uniqueCases: tracking.uniqueCasesByDifficulty.advanced.cases.size,
          totalAttempts: tracking.uniqueCasesByDifficulty.advanced.attempts,
        },
      },
      completedByExamType,
      completedByDisease,
      completedByAdminTag,
      lastCompletedAt: tracking.lastCompletedAt,
      daysSinceLastActivity,
      regularityPerWeek,
      firstCompletedAt: tracking.firstCompletedAt,
    });
  }

  return result.sort((a, b) => b.uniqueCasesCompleted - a.uniqueCasesCompleted);
};

const cachedUserStatistics = cache(async (filtersJson: string) => {
  const filters = JSON.parse(filtersJson) as StatsFilters | undefined;
  return unstable_cache(
    () => fetchUserStatisticsData(filters),
    ['bestof:stats:users:v2', filtersJson],
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
  const uniqueCases = new Set(attempts.map((attempt) => attempt.caseId));
  const totalCompleted = uniqueCases.size;
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
    ['bestof:stats:global:v2', filtersJson],
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
    ['bestof:stats:trend:v2', filtersJson, groupBy],
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

export type UserCompletionTrend = {
  userId: string;
  userName: string;
  color: string;
  trends: { period: string; cumulativeCount: number }[];
};

const fetchUserCompletionTrendsData = async (filters?: StatsFilters, groupBy: 'day' | 'week' | 'month' = 'week') => {
  const where = buildAttemptWhereClause({ filters });

  const attempts = await prisma.caseAttempt.findMany({
    where,
    select: {
      userId: true,
      caseId: true,
      validatedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { validatedAt: 'asc' },
  });

  const userTrendsMap = new Map<string, { name: string; uniqueCasesByPeriod: Map<string, Set<string>> }>();

  for (const attempt of attempts) {
    if (!attempt.validatedAt) continue;

    const userId = attempt.userId;
    const caseId = attempt.caseId;
    const displayName = attempt.user.firstName
      ? `${attempt.user.firstName} ${attempt.user.lastName || ''}`.trim()
      : attempt.user.name || attempt.user.email;

    if (!userTrendsMap.has(userId)) {
      userTrendsMap.set(userId, {
        name: displayName,
        uniqueCasesByPeriod: new Map(),
      });
    }

    const date = new Date(attempt.validatedAt);
    let periodKey: string;

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

    const userData = userTrendsMap.get(userId);
    if (userData) {
      if (!userData.uniqueCasesByPeriod.has(periodKey)) {
        userData.uniqueCasesByPeriod.set(periodKey, new Set());
      }
      userData.uniqueCasesByPeriod.get(periodKey)!.add(caseId);
    }
  }

  const colors = [
    'hsl(221, 83%, 53%)',
    'hsl(262, 83%, 58%)',
    'hsl(142, 76%, 36%)',
    'hsl(38, 92%, 50%)',
    'hsl(0, 84%, 60%)',
  ];
  let colorIndex = 0;

  const result: UserCompletionTrend[] = [];

  for (const [userId, userData] of userTrendsMap.entries()) {
    const sortedPeriods = Array.from(userData.uniqueCasesByPeriod.keys()).sort();
    const uniqueCasesSeenSoFar = new Set<string>();

    const trends = sortedPeriods.map((period) => {
      const casesInPeriod = userData.uniqueCasesByPeriod.get(period)!;
      for (const caseId of casesInPeriod) {
        uniqueCasesSeenSoFar.add(caseId);
      }
      return { period, cumulativeCount: uniqueCasesSeenSoFar.size };
    });

    result.push({
      userId,
      userName: userData.name,
      color: colors[colorIndex % colors.length],
      trends,
    });

    colorIndex++;
  }

  return result;
};

const cachedUserCompletionTrends = cache(async (filtersJson: string, groupBy: 'day' | 'week' | 'month') => {
  const filters = JSON.parse(filtersJson) as StatsFilters | undefined;
  return unstable_cache(
    () => fetchUserCompletionTrendsData(filters, groupBy),
    ['bestof:stats:user-trends:v2', filtersJson, groupBy],
    { tags: [STATS_TAG, CASES_TAG] },
  )();
});

export const getUserCompletionTrends = async (
  filters?: StatsFilters,
  groupBy: 'day' | 'week' | 'month' = 'week',
): Promise<UserCompletionTrend[]> => {
  return cachedUserCompletionTrends(JSON.stringify(filters || {}), groupBy);
};

export type UserCaseHistoryItem = {
  caseId: string;
  caseName: string;
  examType: string | null;
  examTypeId: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  submittedAt: Date;
  attemptId: string;
};

const fetchUserCaseHistoryData = async (userId: string, filters?: Omit<StatsFilters, 'userIds'>) => {
  const where = buildAttemptWhereClause({ filters: { ...filters, userIds: [userId] } });

  const attempts = await prisma.caseAttempt.findMany({
    where,
    select: {
      id: true,
      caseId: true,
      validatedAt: true,
      c: {
        select: {
          id: true,
          name: true,
          difficulty: true,
          examType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { validatedAt: 'desc' },
  });

  return attempts
    .filter((attempt) => attempt.validatedAt !== null)
    .map((attempt) => ({
      caseId: attempt.c.id,
      caseName: attempt.c.name,
      examType: attempt.c.examType?.name || null,
      examTypeId: attempt.c.examType?.id || null,
      difficulty: attempt.c.difficulty,
      submittedAt: attempt.validatedAt as Date,
      attemptId: attempt.id,
    }));
};

const cachedUserCaseHistory = cache(async (userId: string, filtersJson: string) => {
  const filters = JSON.parse(filtersJson) as Omit<StatsFilters, 'userIds'> | undefined;
  return unstable_cache(
    () => fetchUserCaseHistoryData(userId, filters),
    ['bestof:stats:user-history:v2', userId, filtersJson],
    { tags: [STATS_TAG, CASES_TAG] },
  )();
});

export const getUserCaseHistory = async (
  userId: string,
  filters?: Omit<StatsFilters, 'userIds'>,
): Promise<UserCaseHistoryItem[]> => {
  return cachedUserCaseHistory(userId, JSON.stringify(filters || {}));
};

export type UserExamTypeStats = {
  examTypeId: string;
  examTypeName: string;
  completed: number;
  total: number;
  percentage: number;
};

export const getUserExamTypeStats = async (userId: string): Promise<UserExamTypeStats[]> => {
  const [completedAttempts, allExamTypes] = await Promise.all([
    prisma.caseAttempt.findMany({
      where: {
        userId,
        validatedAt: { not: null },
      },
      select: {
        caseId: true,
        c: {
          select: {
            examTypeId: true,
            examType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.examType.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            cases: {
              where: {
                status: 'PUBLISHED',
              },
            },
          },
        },
      },
    }),
  ]);

  const completedByExamType: Record<string, Set<string>> = {};
  for (const attempt of completedAttempts) {
    const examTypeId = attempt.c.examTypeId;
    if (examTypeId) {
      if (!completedByExamType[examTypeId]) {
        completedByExamType[examTypeId] = new Set();
      }
      completedByExamType[examTypeId].add(attempt.caseId);
    }
  }

  return allExamTypes.map((examType) => {
    const uniqueCases = completedByExamType[examType.id]?.size || 0;
    const total = examType._count.cases;
    const percentage = total > 0 ? Math.round((uniqueCases / total) * 100) : 0;

    return {
      examTypeId: examType.id,
      examTypeName: examType.name,
      completed: uniqueCases,
      total,
      percentage,
    };
  });
};

export type DatabaseStatistics = {
  casesByExamType: Array<{ name: string; value: number; color: string }>;
  casesByDifficulty: Array<{ name: string; value: number; color: string }>;
  casesByStatus: Array<{ name: string; value: number; color: string }>;
  casesByDiagnosis: Array<{ name: string; value: number; color: string }>;
  totalCases: number;
  totalExamTypes: number;
  totalDiagnoses: number;
  totalAdminTags: number;
};

const CHART_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 60%)',
  'hsl(25, 95%, 53%)',
  'hsl(173, 58%, 39%)',
  'hsl(340, 82%, 52%)',
];

const DIFFICULTY_COLORS = {
  BEGINNER: 'hsl(142, 76%, 36%)',
  INTERMEDIATE: 'hsl(38, 92%, 50%)',
  ADVANCED: 'hsl(0, 84%, 60%)',
};

const STATUS_COLORS = {
  DRAFT: 'hsl(240, 5%, 64%)',
  PUBLISHED: 'hsl(142, 76%, 36%)',
};

const fetchDatabaseStatisticsData = async (): Promise<DatabaseStatistics> => {
  const [
    casesByExamType,
    casesByDifficulty,
    casesByStatus,
    casesByDiagnosis,
    totalCases,
    totalExamTypes,
    totalDiagnoses,
    totalAdminTags,
  ] = await Promise.all([
    prisma.clinicalCase.groupBy({
      by: ['examTypeId'],
      _count: { id: true },
    }).then(async (groups) => {
      const examTypes = await prisma.examType.findMany({
        select: { id: true, name: true },
      });
      const examTypeMap = new Map(examTypes.map((examType) => [examType.id, examType.name]));
      return groups
        .filter((group) => group.examTypeId !== null)
        .map((group, index) => ({
          name: examTypeMap.get(group.examTypeId!) || 'Unknown',
          value: group._count.id,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .sort((first, second) => second.value - first.value);
    }),
    prisma.clinicalCase.groupBy({
      by: ['difficulty'],
      _count: { id: true },
    }).then((groups) =>
      groups.map((group) => ({
        name: group.difficulty,
        value: group._count.id,
        color: DIFFICULTY_COLORS[group.difficulty],
      }))
    ),
    prisma.clinicalCase.groupBy({
      by: ['status'],
      _count: { id: true },
    }).then((groups) =>
      groups.map((group) => ({
        name: group.status,
        value: group._count.id,
        color: STATUS_COLORS[group.status],
      }))
    ),
    prisma.clinicalCase.groupBy({
      by: ['diseaseTagId'],
      _count: { id: true },
    }).then(async (groups) => {
      const diseaseTags = await prisma.diseaseTag.findMany({
        select: { id: true, name: true },
      });
      const diseaseTagMap = new Map(diseaseTags.map((tag) => [tag.id, tag.name]));
      return groups
        .filter((group) => group.diseaseTagId !== null)
        .map((group, index) => ({
          name: diseaseTagMap.get(group.diseaseTagId!) || 'Unknown',
          value: group._count.id,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .sort((first, second) => second.value - first.value)
        .slice(0, 10);
    }),
    prisma.clinicalCase.count(),
    prisma.examType.count(),
    prisma.diseaseTag.count(),
    prisma.adminTag.count(),
  ]);

  return {
    casesByExamType,
    casesByDifficulty,
    casesByStatus,
    casesByDiagnosis,
    totalCases,
    totalExamTypes,
    totalDiagnoses,
    totalAdminTags,
  };
};

const cachedDatabaseStatistics = cache(async () => {
  return unstable_cache(
    () => fetchDatabaseStatisticsData(),
    ['bestof:stats:database:v1'],
    { tags: [STATS_TAG, CASES_TAG] },
  )();
});

export const getDatabaseStatistics = async (): Promise<DatabaseStatistics> => {
  return cachedDatabaseStatistics();
};
