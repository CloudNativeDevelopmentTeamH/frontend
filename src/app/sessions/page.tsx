"use client";

import * as React from "react";
import Link from "next/link";
import { sessionsApi, categoriesApi } from "@/lib/endpoints";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
    const [sessions, setSessions] = React.useState<Focus.FocusSession[]>([]);
    const [categories, setCategories] = React.useState<Focus.Category[]>([]);
    const [lastRefreshAt, setLastRefreshAt] = React.useState<Date | null>(null);

    // Session dialog state
    const [sessionDialogOpen, setSessionDialogOpen] = React.useState(false);
    const [sessionAction, setSessionAction] = React.useState<"start" | "resume">("start");
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("");
    const [sessionNote, setSessionNote] = React.useState("");

    const reload = React.useCallback(async () => {
        setState((s) => (s === "working" ? "working" : "loading"));
        setError(null);

        try {
            const [res, allSessions, cats] = await Promise.all([
                sessionsApi.running().catch((e: any) => {
                    const msg = e?.message ?? "";
                    if (typeof msg === "string" && msg.includes("404")) return null;
                    throw e;
                }),
                sessionsApi.list(),
                categoriesApi.list(),
            ]);
            setRunning((res as any) ?? null);
            setSessions(allSessions);
            setCategories(cats);
            setLastRefreshAt(new Date());
            setState("idle");
        } catch (e: any) {
            setError(e?.message ?? "Failed to load session data");
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

    function openSessionDialog(action: "start" | "resume") {
        setSessionAction(action);
        setSelectedCategoryId("");
        setSessionNote("");
        setSessionDialogOpen(true);
    }

    function closeSessionDialog() {
        setSessionDialogOpen(false);
        setSelectedCategoryId("");
        setSessionNote("");
    }

    async function handleSessionSubmit() {
        const action = sessionAction;
        closeSessionDialog();

        await mutate(action, async () => {
            const body: any = {};
            if (selectedCategoryId) body.categoryId = selectedCategoryId;
            if (sessionNote.trim()) body.note = sessionNote.trim();

            if (action === "start") {
                await sessionsApi.start(Object.keys(body).length > 0 ? body : undefined);
            } else {
                await sessionsApi.resume(Object.keys(body).length > 0 ? body : undefined);
            }
        });
    }

    const disabled = state === "working";

    const statusLabel = running ? "running" : "not running";

    const getCategoryById = React.useCallback((categoryId: string | null | undefined) => {
        if (!categoryId) return null;
        return categories.find(c => c.categoryId === categoryId);
    }, [categories]);

    const category = React.useMemo(() => {
        if (!running?.categoryId) return null;
        return getCategoryById(running.categoryId);
    }, [running, getCategoryById]);

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-6">
            <div className="mb-4">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    Back to Home
                </Link>
            </div>
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
                                    <div className="mt-1 font-mono text-sm">{running.sessionId ?? "—"}</div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <div className="text-xs text-muted-foreground">Started at</div>
                                    <div className="mt-1 text-sm">{fmtIso(running.startedAt)}</div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <div className="text-xs text-muted-foreground">Category</div>
                                    <div className="mt-1 text-sm">
                                        {category ? (
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-3 w-3 rounded-full border"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                <span className="font-medium">{category.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
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
                            onClick={() => openSessionDialog("start")}
                            disabled={disabled || running !== null}
                            className="sm:w-1/3"
                            title={running ? "Session already running" : undefined}
                        >
                            Start
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => openSessionDialog("resume")}
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

                    <div className="text-xs text-muted-foreground">
                        Last refresh:{" "}
                        <span className="font-medium">
                            {lastRefreshAt ? lastRefreshAt.toLocaleString() : "—"}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* All Sessions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                            No sessions found.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sessions.map(session => {
                                const sessionCategory = getCategoryById(session.categoryId);
                                return (
                                    <div
                                        key={session.sessionId}
                                        className="flex flex-col gap-2 rounded-md border p-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {sessionCategory ? (
                                                    <>
                                                        <span
                                                            className="h-3 w-3 rounded-full border"
                                                            style={{ backgroundColor: sessionCategory.color }}
                                                        />
                                                        <span className="font-medium text-sm">{sessionCategory.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">No category</span>
                                                )}
                                            </div>
                                            <Badge variant={session.endedAt ? "outline" : "secondary"}>
                                                {session.endedAt ? "finished" : "running"}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                                            <div>
                                                <span className="font-medium">Started:</span> {fmtIso(session.startedAt)}
                                            </div>
                                            <div>
                                                <span className="font-medium">Ended:</span> {session.endedAt ? fmtIso(session.endedAt) : "—"}
                                            </div>
                                        </div>
                                        {session.note && (
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Note:</span> {session.note}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{sessionAction === "start" ? "Start" : "Resume"} Session</DialogTitle>
                        <DialogDescription>
                            {sessionAction === "start"
                                ? "Optionally select a category and add a note for this session."
                                : "Optionally change the category or add a note. Previous category will be used if none selected."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Category (optional)</Label>
                            <Select value={selectedCategoryId || undefined} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="No category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.filter(c => !c.archived).map(c => (
                                        <SelectItem key={c.categoryId} value={c.categoryId}>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                                {c.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Note (optional)</Label>
                            <Textarea
                                value={sessionNote}
                                onChange={(e) => setSessionNote(e.target.value)}
                                placeholder="Add a note for this session..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="secondary" onClick={closeSessionDialog}>
                            Cancel
                        </Button>
                        <Button onClick={handleSessionSubmit}>
                            {sessionAction === "start" ? "Start" : "Resume"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
