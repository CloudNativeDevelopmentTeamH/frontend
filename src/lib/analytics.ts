import { apiFetch } from "@/lib/api";
import { categoriesApi } from "@/lib/endpoints";
import { getRuntimeConfig } from "@/lib/runtime-config";

export type AnalyticsSource = "mock" | "api";

export interface AnalyticsCategoryMetric {
    categoryId: string;
    name: string;
    color: string;
    share: number;
    totalSeconds: number;
    averageLengthSeconds: number;
    count: number;
}

export interface AnalyticsTrendPoint {
    label: string;
    minutes: number;
}

export interface AnalyticsSummary {
    averageOverallSeconds: number;
    averageLast10Seconds: number;
    totalSessions: number;
    totalMinutes: number;
    topCategoryName: string;
    topCategoryShare: number;
    topCategoryMinutes: number;
}

export interface AnalyticsDashboard {
    source: AnalyticsSource;
    generatedAt: string;
    summary: AnalyticsSummary;
    categories: AnalyticsCategoryMetric[];
    trend: AnalyticsTrendPoint[];
}

type GeneralStatsResponse = {
    averageLengthOverallSeconds: number;
    averageLengthLast10Seconds: number;
    categoryShares: Array<{
        categoryId: string;
        share: number;
        totalSeconds: number;
    }>;
};

type CategoryStatsResponse = {
    categoryId: string;
    averageLengthSeconds: number;
    count: number;
    sumSeconds: number;
};

const MOCK_CATEGORIES: AnalyticsCategoryMetric[] = [
    {
        categoryId: "deep-work",
        name: "Deep Work",
        color: "#3b82f6",
        share: 0.34,
        totalSeconds: 10200,
        averageLengthSeconds: 2550,
        count: 4,
    },
    {
        categoryId: "research",
        name: "Research",
        color: "#8b5cf6",
        share: 0.22,
        totalSeconds: 6600,
        averageLengthSeconds: 1650,
        count: 4,
    },
    {
        categoryId: "admin",
        name: "Admin",
        color: "#f97316",
        share: 0.16,
        totalSeconds: 4800,
        averageLengthSeconds: 800,
        count: 6,
    },
    {
        categoryId: "meetings",
        name: "Meetings",
        color: "#06b6d4",
        share: 0.18,
        totalSeconds: 5400,
        averageLengthSeconds: 1800,
        count: 3,
    },
    {
        categoryId: "learning",
        name: "Learning",
        color: "#22c55e",
        share: 0.1,
        totalSeconds: 3000,
        averageLengthSeconds: 1000,
        count: 3,
    },
];

const MOCK_TREND: AnalyticsTrendPoint[] = [
    { label: "Mon", minutes: 64 },
    { label: "Tue", minutes: 51 },
    { label: "Wed", minutes: 73 },
    { label: "Thu", minutes: 58 },
    { label: "Fri", minutes: 82 },
    { label: "Sat", minutes: 34 },
    { label: "Sun", minutes: 41 },
];

function sumSeconds(items: Array<{ totalSeconds: number }>): number {
    return items.reduce((total, item) => total + item.totalSeconds, 0);
}

function buildSummary(categories: AnalyticsCategoryMetric[], averageOverallSeconds: number, averageLast10Seconds: number): AnalyticsSummary {
    const totalSeconds = sumSeconds(categories);
    const totalSessions = categories.reduce((total, item) => total + item.count, 0);
    const topCategory = categories[0] ?? {
        name: "Uncategorized",
        share: 0,
        totalSeconds: 0,
    };

    return {
        averageOverallSeconds,
        averageLast10Seconds,
        totalSessions,
        totalMinutes: Math.round(totalSeconds / 60),
        topCategoryName: topCategory.name,
        topCategoryShare: topCategory.share,
        topCategoryMinutes: Math.round(topCategory.totalSeconds / 60),
    };
}

function buildMockDashboard(): AnalyticsDashboard {
    return {
        source: "mock",
        generatedAt: new Date().toISOString(),
        summary: buildSummary(MOCK_CATEGORIES, 1512, 1350),
        categories: MOCK_CATEGORIES,
        trend: MOCK_TREND,
    };
}

async function buildApiDashboard(): Promise<AnalyticsDashboard> {
    const [general, categories] = await Promise.all([
        apiFetch<GeneralStatsResponse>("/analytics/general"),
        categoriesApi.list(),
    ]);

    const breakdown = await Promise.all(
        general.categoryShares.map(async (item) => {
            const detail = await apiFetch<CategoryStatsResponse>(
                `/analytics/category?categoryId=${encodeURIComponent(item.categoryId)}`
            );
            const category = categories.find((entry) => entry.categoryId === item.categoryId);

            return {
                categoryId: item.categoryId,
                name: category?.name ?? item.categoryId,
                color: category?.color ?? "#64748b",
                share: item.share,
                totalSeconds: item.totalSeconds,
                averageLengthSeconds: detail.averageLengthSeconds,
                count: detail.count,
            } satisfies AnalyticsCategoryMetric;
        })
    );
    // Ensure stable ordering: show categories sorted by share descending.
    const sorted = breakdown.slice().sort((a, b) => b.share - a.share);

    const totalSeconds = sumSeconds(sorted);
    const topCategory = sorted[0] ?? {
        name: "Uncategorized",
        share: 0,
        totalSeconds: 0,
    };

    return {
        source: "api",
        generatedAt: new Date().toISOString(),
        summary: {
            averageOverallSeconds: general.averageLengthOverallSeconds,
            averageLast10Seconds: general.averageLengthLast10Seconds,
            totalSessions: sorted.reduce((total, item) => total + item.count, 0),
            totalMinutes: Math.round(totalSeconds / 60),
            topCategoryName: topCategory.name,
            topCategoryShare: topCategory.share,
            topCategoryMinutes: Math.round(topCategory.totalSeconds / 60),
        },
        categories: sorted,
        trend: createTrendFromCategories(sorted),
    };
}

function createTrendFromCategories(categories: AnalyticsCategoryMetric[]): AnalyticsTrendPoint[] {
    const seeds = categories.length > 0 ? categories : MOCK_CATEGORIES;
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return labels.map((label, index) => {
        const source = seeds[index % seeds.length];
        const minutes = Math.max(20, Math.round((source.totalSeconds / 60) * (0.55 + ((index % 3) * 0.1))));
        return { label, minutes };
    });
}

export async function loadAnalyticsDashboard(): Promise<AnalyticsDashboard> {
    const runtime = getRuntimeConfig();
    const apiBaseUrl = (runtime.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
    const configuredSource = (runtime.ANALYTICS_DATA_SOURCE ?? process.env.NEXT_PUBLIC_ANALYTICS_DATA_SOURCE ?? "").toLowerCase();

    // Prefer live analytics whenever an API base URL is available in runtime config.
    // Only force mock when explicitly configured and no API base URL is present.
    const source: AnalyticsSource = apiBaseUrl
        ? "api"
        : configuredSource === "api"
          ? "api"
          : "mock";

    if (source === "api") {
        return buildApiDashboard();
    }

    return buildMockDashboard();
}
