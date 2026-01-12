import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function js(obj: unknown) {
    return `window.__RUNTIME_CONFIG__ = ${JSON.stringify(obj)};`;
}

export async function GET() {
    const API_BASE_URL = process.env.API_BASE_URL ?? "";
    const APP_VERSION = process.env.APP_VERSION ?? "dev";

    const body = js({ API_BASE_URL, APP_VERSION });

    return new NextResponse(body, {
        status: 200,
        headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store, max-age=0",
        },
    });
}
