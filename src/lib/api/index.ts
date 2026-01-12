import { ApiError } from "@/lib/api/errors";
import { resolveApiBaseUrl } from "@/lib/api/base-url";
import { joinUrl, tryParseJson, getRuntimeBaseUrl } from "@/lib/api/utils";

export async function apiFetch<T>(path: string, options: Api.FetchOptions = {}): Promise<T> {
    const baseUrl = options.baseUrl ?? getRuntimeBaseUrl();
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

    if (res.status === 204) return undefined as T;

    const maybeJson = await tryParseJson(res);
    return (maybeJson as T) ?? (undefined as T);
}
