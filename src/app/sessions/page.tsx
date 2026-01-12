"use client";

import * as React from "react";
import { sessionsApi } from "@/lib/endpoints";

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

export default function SessionsPage() {
    const [state, setState] = React.useState<LoadState>("idle");
    const [error, setError] = React.useState<string | null>(null);

    const [running, setRunning] = React.useState<Focus.FocusSession | null>(null);
    const [lastRefreshAt, setLastRefreshAt] = React.useState<Date | null>(null);

    const reload = React.useCallback(async () => {
        setState((s) => (s === "working" ? "working" : "loading"));
        setError(null);

        try {
            const res = await sessionsApi.running();
            // apiFetch returns undefined for 204 -> treat as null
            setRunning((res as any) ?? null);
            setLastRefreshAt(new Date());
            setState("idle");
        } catch (e: any) {
            // If backend uses 404 for "no running session", treat as null
            const msg = e?.message ?? "Failed to load running session";
            if (typeof msg === "string" && msg.includes("404")) {
                setRunning(null);
                setLastRefreshAt(new Date());
                setState("idle");
                return;
            }
            setError(msg);
            setState("error");
        }
    }, []);

    React.useEffect(() => {
        void reload();
    }, [reload]);

    async function mutate(action: "start" | "resume" | "stop", fn: () => Promise<void>) {
        setState("working");
        setError(null);
        try {
            await fn();
            // After any command, refresh real state from BE
            await reload();
        } catch (e: any) {
            setError(e?.message ?? `Action failed: ${action}`);
            setState("error");
        } finally {
            // reload() sets idle/error; if reload wasn't reached due to error above, keep error
            setState((s) => (s === "loading" ? "idle" : s));
        }
    }

    const disabled = state === "working";

    const statusLabel = running ? "running" : "not running";

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Sessions</h1>
                    <p className="text-sm text-muted-foreground">
                        Control and inspect the current running session.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant={running ? "secondary" : "outline"}>{statusLabel}</Badge>
                    <Button
                        variant="secondary"
                        onClick={() => void reload()}
                        disabled={state === "loading" || disabled}
                    >
                        Refresh
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
                        <Button variant="secondary" onClick={() => void reload()} disabled={disabled}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-base">Current session</CardTitle>
                    <div className="flex items-center gap-2">
                        {state === "loading" ? <Badge variant="outline">loading…</Badge> : null}
                        {state === "working" ? <Badge variant="outline">working…</Badge> : null}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {running ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="rounded-md border p-3">
                                    <div className="text-xs text-muted-foreground">Session ID</div>
                                    <div className="mt-1 font-mono text-sm">{running.id ?? "—"}</div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <div className="text-xs text-muted-foreground">Started at</div>
                                    <div className="mt-1 text-sm">{fmtIso(running.startAt)}</div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <div className="text-xs text-muted-foreground">Category ID</div>
                                    <div className="mt-1 font-mono text-sm">
                                        {(running.categoryId as any) ?? "—"}
                                    </div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <div className="text-xs text-muted-foreground">Note</div>
                                    <div className="mt-1 text-sm">
                                        {typeof running.note === "string" && running.note.trim()
                                            ? running.note
                                            : "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Optional debug for unknown DTO fields */}
                            {/* <pre className="rounded-md border p-3 text-xs overflow-auto">{JSON.stringify(running, null, 2)}</pre> */}
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
                            disabled={disabled}
                            className="sm:w-1/3"
                        >
                            Start
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => mutate("resume", () => sessionsApi.resume())}
                            disabled={disabled}
                            className="sm:w-1/3"
                        >
                            Resume
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => mutate("stop", () => sessionsApi.stop())}
                            disabled={disabled}
                            className="sm:w-1/3"
                        >
                            Stop
                        </Button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Last refresh:{" "}
                        <span className="font-medium">
                            {lastRefreshAt ? lastRefreshAt.toLocaleString() : "—"}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
