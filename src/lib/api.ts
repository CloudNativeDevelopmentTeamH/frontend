export class ApiError extends Error {
    public readonly status: number;
    public readonly details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

function joinUrl(base: string, path: string): string {
    if (!base) return path;
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

async function tryParseJson(res: Response): Promise<unknown | undefined> {
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return undefined;
    try {
        return await res.json();
    } catch {
        return undefined;
    }
}

type ApiFetchOptions = RequestInit & {
    // Override (ENV default)
    baseUrl?: string;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    const url = baseUrl ? joinUrl(baseUrl, path) : path;

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "content-type": "application/json" } : {}),
            ...(options.headers ?? {}),
        },
        cache: "no-store",
    });

    if (!res.ok) {
        const details = await tryParseJson(res);
        throw new ApiError(`Request failed: ${res.status}`, res.status, details);
    }

    // Handle 204 gracefully
    if (res.status === 204) return undefined as T;

    const maybeJson = await tryParseJson(res);
    if (maybeJson === undefined) return undefined as T;

    return maybeJson as T;
}
