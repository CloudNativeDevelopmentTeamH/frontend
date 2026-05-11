import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function js(obj: unknown) {
    return `window.__RUNTIME_CONFIG__ = ${JSON.stringify(obj)};`;
}

export async function GET() {
    const API_BASE_URL = process.env.API_BASE_URL ?? "";
    // If an API base URL is provided, prefer live API as default data source.
    const ANALYTICS_DATA_SOURCE = process.env.ANALYTICS_DATA_SOURCE ?? (API_BASE_URL ? "api" : "mock");
    const APP_VERSION = process.env.APP_VERSION ?? "dev";

    const body = js({ API_BASE_URL, ANALYTICS_DATA_SOURCE, APP_VERSION });

    return new NextResponse(body, {
        status: 200,
        headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store, max-age=0",
        },
    });
}
