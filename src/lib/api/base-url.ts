import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * Base URL resolution for browser fetches.
 * - runtime config (browser) has priority (true runtime-config)
 * - NEXT_PUBLIC_API_BASE_URL is fallback (build-time)
 */
export function resolveApiBaseUrl(override?: string): string {
    if (override) return override;

    const runtime = getRuntimeConfig();
    return runtime.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}
