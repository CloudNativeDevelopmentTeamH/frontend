"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { sessionsApi, categoriesApi } from "@/lib/endpoints";
import { authenticate, logout, type AuthUser } from "@/lib/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type LoadState = "idle" | "loading" | "working" | "error";

function fmtIso(iso?: unknown): string {
    if (typeof iso !== "string") return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

export default function HomePage() {
    const router = useRouter();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [authChecking, setAuthChecking] = React.useState(true);
    const [state, setState] = React.useState<LoadState>("idle");
    const [error, setError] = React.useState<string | null>(null);

    const [running, setRunning] = React.useState<Focus.FocusSession | null>(null);
    const [categories, setCategories] = React.useState<Focus.Category[]>([]);
    const [lastRefreshAt, setLastRefreshAt] = React.useState<Date | null>(null);

    const activeCount = React.useMemo(
        () => categories.filter((c) => !c.archived).length,
        [categories]
    );
    const archivedCount = React.useMemo(
        () => categories.filter((c) => c.archived).length,
        [categories]
    );

    // Check authentication on mount
    React.useEffect(() => {
        const checkAuth = async () => {
            const currentUser = await authenticate();
            if (!currentUser) {
                router.push("/login");
            } else {
                setUser(currentUser);
                setAuthChecking(false);
            }
        };
        void checkAuth();
    }, [router]);

    const reload = React.useCallback(async () => {
        setState((s) => (s === "working" ? "working" : "loading"));
        setError(null);

        try {
            const [r, cats] = await Promise.all([
                sessionsApi.running().catch((e: any) => {
                    // treat 404 as "not running"
                    const msg = e?.message ?? "";
                    if (typeof msg === "string" && msg.includes("404")) return null;
                    throw e;
                }),
                categoriesApi.list(),
            ]);

            setRunning((r as any) ?? null);
            setCategories(cats);

            setLastRefreshAt(new Date());
            setState("idle");
        } catch (e: any) {
            setError(e?.message ?? "Failed to load dashboard data");
            setState("error");
        }
    }, []);

    React.useEffect(() => {
        if (!authChecking) {
            void reload();
        }
    }, [reload, authChecking]);

    async function mutate(action: "start" | "resume" | "stop", fn: () => Promise<void>) {
        setState("working");
        setError(null);
        try {
            await fn();
            await reload();
        } catch (e: any) {
            setError(e?.message ?? `Action failed: ${action}`);
            setState("error");
        } finally {
            setState((s) => (s === "loading" ? "idle" : s));
        }
    }

    async function handleLogout() {
        await logout();
        router.push("/login");
    }

    if (authChecking) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 p-6">
                <div className="text-center text-muted-foreground">
                    Loading...
                </div>
            </div>
        );
    }

    const disabled = state === "working";

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Welcome {user?.name || user?.email || "User"} to <span className="text-blue-500 font-bold">Focus</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Minimal dashboard for sessions and categories.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {state === "loading" ? <Badge variant="outline">loading…</Badge> : null}
                    {state === "working" ? <Badge variant="outline">working…</Badge> : null}
                    <Button
                        variant="secondary"
                        onClick={() => void reload()}
                        disabled={state === "loading" || disabled}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => void handleLogout()}
                        disabled={disabled}
                    >
                        Logout
                    </Button>
                </div>
            </div>

            {error ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Error</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-sm">{error}</div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => void reload()} disabled={disabled}>
                                Retry
                            </Button>
                            <Button variant="ghost" onClick={() => setError(null)} disabled={disabled}>
                                Dismiss
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Current session */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <CardTitle className="text-base">Current session</CardTitle>
                        <Badge variant={running ? "secondary" : "outline"}>
                            {running ? "running" : "not running"}
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {running ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Started</span>
                                    <span className="font-medium">{fmtIso(running.startedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Category ID</span>
                                    <span className="font-mono text-xs">
                                        {(running.categoryId as any) ?? "—"}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-muted-foreground">Note</div>
                                    <div className="rounded-md border p-2 text-sm">
                                        {typeof running.note === "string" && running.note.trim()
                                            ? running.note
                                            : "—"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                No session is currently running.
                            </div>
                        )}

                        <Separator />

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                onClick={() => mutate("start", () => sessionsApi.start())}
                                disabled={disabled || running !== null}
                                className="sm:w-1/3"
                                title={running ? "Session already running" : undefined}
                            >
                                Start
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => mutate("resume", () => sessionsApi.resume())}
                                disabled={disabled || running !== null}
                                className="sm:w-1/3"
                                title={running ? "Stop current session first" : "Resume last session"}
                            >
                                Resume
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => mutate("stop", () => sessionsApi.stop(String(running?.sessionId ?? "")))}
                                disabled={disabled || !running}
                                className="sm:w-1/3"
                                title={!running ? "No running session" : undefined}
                            >
                                Stop
                            </Button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                Last refresh: {lastRefreshAt ? lastRefreshAt.toLocaleString() : "—"}
                            </span>
                            <Link href="/sessions" className="underline underline-offset-4">
                                Open sessions
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Categories */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <CardTitle className="text-base">Categories</CardTitle>
                        <Link href="/categories">
                            <Button variant="secondary">Open</Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Active: {activeCount}</Badge>
                            <Badge variant="secondary">Archived: {archivedCount}</Badge>
                            <Badge variant="outline">Total: {categories.length}</Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Manage your category set for organizing focus sessions.
                        </div>

                        <Separator />

                        {/* Show a small preview list */}
                        <div className="space-y-2">
                            {categories.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No categories yet.
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {categories
                                        .filter((c) => !c.archived)
                                        .slice(0, 5)
                                        .map((c) => (
                                            <li
                                                key={c.categoryId}
                                                className="flex items-center justify-between rounded-md border p-2"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="h-3 w-3 rounded-full border"
                                                        style={{ backgroundColor: c.color }}
                                                    />
                                                    <span className="truncate text-sm font-medium">{c.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="font-mono">
                                                    {c.categoryId}
                                                </Badge>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                            Showing up to 5 active categories.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
