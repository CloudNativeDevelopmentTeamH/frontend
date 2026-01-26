"use client";

import * as React from "react";
import Link from "next/link";
import { categoriesApi } from "@/lib/endpoints";
import { COLOR_PRESETS } from "@/lib/colors";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LoadState = "idle" | "loading" | "error";

function getDefaultColorHex(): string {
    return COLOR_PRESETS.find((c) => c.key === "blue")?.hex ?? COLOR_PRESETS[0]?.hex ?? "#3b82f6";
}

function getColorName(hex: string): string {
    return COLOR_PRESETS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? "Custom";
}

function ColorDot({ color }: { color: string }) {
    return (
        <span
            className="inline-block h-3 w-3 rounded-full border"
            style={{ backgroundColor: color }}
            aria-label={`Color ${color} `}
            title={color}
        />
    );
}

function CategoryRow({
    c,
    disabled,
    onArchiveToggle,
    onDelete,
}: {
    c: Focus.Category;
    disabled: boolean;
    onArchiveToggle: (c: Focus.Category) => void;
    onDelete: (c: Focus.Category) => void;
}) {
    return (
        <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-center gap-3">
                <ColorDot color={c.color} />
                <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="font-mono">
                            {c.id}
                        </Badge>
                        {c.archived ? <Badge variant="outline">archived</Badge> : null}
                    </div>
                </div>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" disabled={disabled}>
                        Actions
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="max-w-[260px] truncate">{c.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onArchiveToggle(c)}>
                        {c.archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(c)}>
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    );
}

export default function CategoriesPage() {
    const [state, setState] = React.useState<LoadState>("idle");
    const [error, setError] = React.useState<string | null>(null);

    const [items, setItems] = React.useState<Focus.Category[]>([]);
    const [mutating, setMutating] = React.useState(false);

    // Create dialog state
    const [createOpen, setCreateOpen] = React.useState(false);
    const [name, setName] = React.useState("");
    const [color, setColor] = React.useState<string>(getDefaultColorHex());

    const active = React.useMemo(() => items.filter((c) => !c.archived), [items]);
    const archived = React.useMemo(() => items.filter((c) => c.archived), [items]);

    const reload = React.useCallback(async () => {
        setState("loading");
        setError(null);
        try {
            const data = await categoriesApi.list();
            data.sort((a, b) => {
                if (a.archived !== b.archived) return a.archived ? 1 : -1;
                return a.name.localeCompare(b.name);
            });
            setItems(data);
            setState("idle");
        } catch (e: any) {
            setError(e?.message ?? "Failed to load categories");
            setState("error");
        }
    }, []);

    React.useEffect(() => {
        void reload();
    }, [reload]);

    function resetCreateForm() {
        setName("");
        setColor(getDefaultColorHex());
    }

    async function withMutation(fn: () => Promise<void>, fallbackMessage: string) {
        setMutating(true);
        setError(null);
        try {
            await fn();
            await reload();
        } catch (e: any) {
            setError(e?.message ?? fallbackMessage);
            setState("error");
        } finally {
            setMutating(false);
        }
    }

    async function onCreate() {
        const trimmed = name.trim();
        if (!trimmed) return;

        await withMutation(
            async () => {
                await categoriesApi.create({ name: trimmed, color });
                resetCreateForm();
                setCreateOpen(false);
            },
            "Create failed"
        );
    }

    async function onArchiveToggle(c: Focus.Category) {
        await withMutation(
            async () => {
                if (c.archived) {
                    await categoriesApi.unarchive({ categoryId: c.id });
                } else {
                    await categoriesApi.archive({ categoryId: c.id });
                }
            },
            "Update failed"
        );
    }

    async function onDelete(c: Focus.Category) {
        const ok = window.confirm(`Delete category "${c.name}" ? `);
        if (!ok) return;

        await withMutation(
            async () => {
                await categoriesApi.delete({ categoryId: c.id });
            },
            "Delete failed"
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <div className="mb-4">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    Back to Home
                </Link>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Categories</h1>
                    <p className="text-sm text-muted-foreground">Manage categories used for focus sessions.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => void reload()} disabled={state === "loading" || mutating}>
                        Refresh
                    </Button>

                    <Dialog
                        open={createOpen}
                        onOpenChange={(open) => {
                            setCreateOpen(open);
                            if (!open) resetCreateForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button>Create</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create category</DialogTitle>
                                <DialogDescription>
                                    Provide a name and pick a color. You can archive categories later.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Deep Work"
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Color</label>

                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                        {COLOR_PRESETS.map((c) => (
                                            <button
                                                key={c.key}
                                                type="button"
                                                onClick={() => setColor(c.hex)}
                                                className={[
                                                    "flex items-center gap-2 rounded-md border px-2 py-1 text-sm",
                                                    color.toLowerCase() === c.hex.toLowerCase() ? "ring-2 ring-offset-2" : "",
                                                ].join(" ")}
                                                aria-label={`Select color ${c.name} `}
                                            >
                                                <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                                                <span className="truncate">{c.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        Selected: {getColorName(color)} <span className="font-mono">({color})</span>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={mutating}>
                                    Cancel
                                </Button>
                                <Button onClick={onCreate} disabled={mutating || !name.trim()}>
                                    Create
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {error ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Error</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-sm">{error}</div>
                        <Button variant="secondary" onClick={() => void reload()} disabled={mutating}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Active: {active.length}</Badge>
                    <Badge variant="secondary">Archived: {archived.length}</Badge>
                    <Badge variant="outline">Total: {items.length}</Badge>
                    {state === "loading" ? <Badge variant="outline">loading…</Badge> : null}
                    {mutating ? <Badge variant="outline">working…</Badge> : null}
                </CardContent>
            </Card>

            <Separator />

            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Active categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {state === "loading" && items.length === 0 ? (
                                <div className="text-sm text-muted-foreground">Loading…</div>
                            ) : active.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No active categories.</div>
                            ) : (
                                <ul className="space-y-2">
                                    {active.map((c) => (
                                        <CategoryRow
                                            key={c.id}
                                            c={c}
                                            disabled={mutating}
                                            onArchiveToggle={onArchiveToggle}
                                            onDelete={onDelete}
                                        />
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="archived">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Archived categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {archived.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No archived categories.</div>
                            ) : (
                                <ul className="space-y-2">
                                    {archived.map((c) => (
                                        <CategoryRow
                                            key={c.id}
                                            c={c}
                                            disabled={mutating}
                                            onArchiveToggle={onArchiveToggle}
                                            onDelete={onDelete}
                                        />
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
