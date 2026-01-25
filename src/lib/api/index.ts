import { ApiError } from "@/lib/api/errors";
import { resolveApiBaseUrl } from "@/lib/api/base-url";
import { joinUrl, tryParseJson, getRuntimeBaseUrl } from "@/lib/api/utils";

export async function apiFetch<T>(path: string, options: Api.FetchOptions = {}): Promise<T> {
    const baseUrl = options.baseUrl ?? getRuntimeBaseUrl();
    const url = baseUrl ? joinUrl(baseUrl, path) : path;

    console.log(`[API] ${options.method ?? 'GET'} ${url}`, { baseUrl, path });

    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...(options.body ? { "content-type": "application/json" } : {}),
                ...(options.headers ?? {}),
            },
            credentials: "include",
            cache: "no-store",
        });

        console.log(`[API] ${options.method ?? 'GET'} ${url} → ${res.status}`);

        if (!res.ok) {
            const details = await tryParseJson(res);
            console.error(`[API] Request failed:`, { url, status: res.status, details });
            throw new ApiError(`Request failed: ${res.status}`, res.status, details);
        }

        if (res.status === 204) return undefined as T;

        const maybeJson = await tryParseJson(res);
        return (maybeJson as T) ?? (undefined as T);
    } catch (err) {
        console.error(`[API] Error fetching ${url}:`, err);
        throw err;
    }
}
