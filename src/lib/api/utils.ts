export function joinUrl(base: string, path: string): string {
    if (!base) return path;
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

export async function tryParseJson(res: Response): Promise<unknown | undefined> {
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return undefined;
    try {
        return await res.json();
    } catch {
        return undefined;
    }
}

export function getRuntimeBaseUrl(): string {
    if (typeof window === "undefined") return "";
    return (window as any).__RUNTIME_CONFIG__?.API_BASE_URL ?? "";
}