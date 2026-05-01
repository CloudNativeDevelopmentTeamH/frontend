"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, Clock3, Sparkles, TrendingUp, RefreshCcw, Layers3 } from "lucide-react";

import { authenticate, type AuthUser } from "@/lib/auth";
import { loadAnalyticsDashboard, type AnalyticsDashboard } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatMinutes(minutes: number): string {
    const rounded = Math.max(0, Math.round(minutes));
    const hours = Math.floor(rounded / 60);
    const remainingMinutes = rounded % 60;

    if (hours === 0) {
        return `${rounded} min`;
    }

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatSeconds(seconds: number): string {
    if (!Number.isFinite(seconds)) return "—";
    const rounded = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(rounded / 60);
    const remainingSeconds = rounded % 60;

    if (minutes === 0) {
        return `${rounded}s`;
    }

    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function MetricCard({
    icon,
    label,
    value,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {icon}
                            <span>{label}</span>
                        </div>
                        <div className="text-3xl font-semibold tracking-tight">{value}</div>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ProgressRow({
    label,
    value,
    share,
    color,
    description,
}: {
    label: string;
    value: string;
    share: number;
    color: string;
    description: string;
}) {
    return (
        <div className="space-y-2 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate font-medium">{label}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                </div>
                <div className="text-right">
                    <div className="font-semibold">{value}</div>
                    <div className="text-xs text-muted-foreground">{Math.round(share * 100)}%</div>
                </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, share * 100)}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const router = useRouter();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [authChecking, setAuthChecking] = React.useState(true);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [dashboard, setDashboard] = React.useState<AnalyticsDashboard | null>(null);

    React.useEffect(() => {
        const checkAuth = async () => {
            const currentUser = await authenticate();
            if (!currentUser) {
                router.push("/login");
                return;
            }

            setUser(currentUser);
            setAuthChecking(false);
        };

        void checkAuth();
    }, [router]);

    const reload = React.useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await loadAnalyticsDashboard();
            setDashboard(data);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load analytics data");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (!authChecking) {
            void reload();
        }
    }, [authChecking, reload]);

    if (authChecking) {
        return (
            <div className="mx-auto max-w-6xl p-6">
                <div className="rounded-3xl border bg-card/70 p-8 text-center text-muted-foreground shadow-sm backdrop-blur">
                    Loading analytics…
                </div>
            </div>
        );
    }

    const isMock = dashboard?.source === "mock";

    return (
        <div className="relative mx-auto max-w-6xl space-y-6 p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.14),_transparent_38%),linear-gradient(to_bottom,_rgba(15,23,42,0.04),_transparent_64%)]" />

            <div className="flex flex-col gap-3 rounded-3xl border bg-card/70 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
                            <Badge variant={isMock ? "secondary" : "outline"} className="gap-1">
                                {isMock ? <Sparkles className="h-3.5 w-3.5" /> : <Layers3 className="h-3.5 w-3.5" />}
                                {isMock ? "Mock data" : "Live API"}
                            </Badge>
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            A dashboard for session behavior, category distribution, and focus load. The current data source can be swapped from mock to the real endpoint without changing the page structure.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{user?.name || user?.email || "User"}</Badge>
                    <Button variant="secondary" onClick={() => void reload()} disabled={loading}>
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {error ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Error</CardTitle>
                        <CardDescription>Could not load analytics data.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3">
                        <div className="text-sm text-destructive">{error}</div>
                        <Button variant="secondary" onClick={() => void reload()}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            {dashboard ? (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            icon={<Clock3 className="h-4 w-4" />}
                            label="Average session length"
                            value={formatSeconds(dashboard.summary.averageOverallSeconds)}
                            description="Overall average duration across all finished sessions."
                        />
                        <MetricCard
                            icon={<TrendingUp className="h-4 w-4" />}
                            label="Last 10 average"
                            value={formatSeconds(dashboard.summary.averageLast10Seconds)}
                            description="Rolling average over the latest completed sessions."
                        />
                        <MetricCard
                            icon={<BarChart3 className="h-4 w-4" />}
                            label="Total focus time"
                            value={formatMinutes(dashboard.summary.totalMinutes)}
                            description="Aggregated time spent in tracked sessions."
                        />
                        <MetricCard
                            icon={<Layers3 className="h-4 w-4" />}
                            label="Top category"
                            value={dashboard.summary.topCategoryName}
                            description={`${Math.round(dashboard.summary.topCategoryShare * 100)}% of total focus time`}
                        />
                    </div>

                    <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="categories">Categories</TabsTrigger>
                            <TabsTrigger value="notes">Notes</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                <Card className="xl:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-base">Focus load shape</CardTitle>
                                        <CardDescription>
                                            Sample weekly distribution generated from the current data set.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex h-64 items-end gap-3 rounded-2xl border bg-muted/30 p-4">
                                            {dashboard.trend.map((point) => {
                                                const max = Math.max(...dashboard.trend.map((item) => item.minutes));
                                                const height = Math.max(12, (point.minutes / max) * 100);
                                                return (
                                                    <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                                                        <div className="text-xs font-medium text-muted-foreground">{formatMinutes(point.minutes)}</div>
                                                        <div
                                                            className="w-full max-w-16 rounded-t-2xl bg-gradient-to-t from-blue-500 via-violet-500 to-cyan-400 shadow-sm"
                                                            style={{ height: `${height}%` }}
                                                        />
                                                        <div className="text-xs text-muted-foreground">{point.label}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Snapshot</CardTitle>
                                        <CardDescription>Current status based on the latest available data source.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-2xl border bg-muted/30 p-4">
                                            <div className="text-xs text-muted-foreground">Top category share</div>
                                            <div className="mt-1 text-2xl font-semibold">{Math.round(dashboard.summary.topCategoryShare * 100)}%</div>
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                {dashboard.summary.topCategoryName} leads the session distribution.
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border bg-muted/30 p-4">
                                            <div className="text-xs text-muted-foreground">Finished sessions</div>
                                            <div className="mt-1 text-2xl font-semibold">{dashboard.summary.totalSessions}</div>
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                Derived from the category-level counts available in the data source.
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="categories" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Category breakdown</CardTitle>
                                    <CardDescription>
                                        Time share, average length, and session counts per category.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {dashboard.categories.map((category) => (
                                        <ProgressRow
                                            key={category.categoryId}
                                            label={category.name}
                                            value={formatMinutes(category.totalSeconds / 60)}
                                            share={category.share}
                                            color={category.color}
                                            description={`${category.count} sessions · avg ${formatSeconds(category.averageLengthSeconds)}`}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notes" className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-base">What this page is built for</CardTitle>
                                        <CardDescription>
                                            This dashboard is intentionally backed by a swappable data source.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                                        <p>
                                            The current implementation uses mock data by default so the page can be designed and iterated on before the real analytics endpoint is wired in.
                                        </p>
                                        <p>
                                            When the backend endpoint is ready, set <span className="font-mono text-foreground">ANALYTICS_DATA_SOURCE=api</span> to switch the same UI to live data.
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <Badge variant="secondary">Mock first</Badge>
                                            <Badge variant="secondary">API-ready</Badge>
                                            <Badge variant="secondary">Replaceable source</Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Source</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Mode</span>
                                            <Badge variant={dashboard.source === "mock" ? "secondary" : "outline"}>{dashboard.source}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Generated at</span>
                                            <span className="font-mono text-xs">{new Date(dashboard.generatedAt).toLocaleString()}</span>
                                        </div>
                                        <Separator />
                                        <div className="text-muted-foreground">
                                            The page will stay structurally stable even when the source changes.
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            ) : null}
        </div>
    );
}
