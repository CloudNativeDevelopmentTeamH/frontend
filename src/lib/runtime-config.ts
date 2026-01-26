export type RuntimeConfig = {
    API_BASE_URL?: string;
    AUTH_API_BASE_URL?: string;
    APP_VERSION?: string;
};

export function getRuntimeConfig(): RuntimeConfig {
    if (typeof window === "undefined") return {};
    return (window as any).__RUNTIME_CONFIG__ ?? {};
}
