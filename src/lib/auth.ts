/**
 * Auth utility functions
 * Note: Backend uses cookie-based authentication
 */

import { getRuntimeConfig } from "@/lib/runtime-config";

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
}

export type AuthErrorCode =
    | "VALIDATION_ERROR"
    | "CONFLICT_ERROR"
    | "UNAUTHORIZED"
    | "INTERNAL_SERVER_ERROR"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";

/**
 * Abstract error type for auth operations (business logic layer)
 */
export interface AuthError {
    code: AuthErrorCode;
    message: string;
}

/**
 * Internal HTTP-specific error (infrastructure layer)
 */
class AuthApiError extends Error {
    code: AuthErrorCode;
    status?: number;

    constructor(message: string, options?: { code?: AuthErrorCode; status?: number }) {
        super(message);
        this.name = "AuthApiError";
        this.code = options?.code ?? "UNKNOWN_ERROR";
        this.status = options?.status;
    }
}

/**
 * Parse HTTP error response and convert to AuthError
 */
async function buildAuthError(response: Response, fallbackMessage: string): Promise<AuthError> {
    let message = fallbackMessage;
    let code: AuthErrorCode = "UNKNOWN_ERROR";

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
        const body = await response.json().catch(() => null) as {
            error?: { code?: string; message?: string };
            message?: string;
        } | null;

        if (body?.error?.message) {
            message = body.error.message;
        } else if (body?.message) {
            message = body.message;
        }

        const rawCode = body?.error?.code;
        if (rawCode === "VALIDATION_ERROR" || rawCode === "CONFLICT_ERROR" || rawCode === "UNAUTHORIZED" || rawCode === "INTERNAL_SERVER_ERROR") {
            code = rawCode;
        }
    } else {
        const text = await response.text().catch(() => "");
        if (text) {
            message = text;
        }
    }

    return { code, message };
}

function getAuthApiUrl(): string {
    const runtime = getRuntimeConfig();
    return runtime.AUTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_AUTH_API_BASE_URL ?? "";
}

function getFocusApiUrl(): string {
    const runtime = getRuntimeConfig();
    return runtime.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<boolean> {
    const authApiUrl = getAuthApiUrl();

    try {
        const res = await fetch(`${authApiUrl}/auth/authenticate`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        return res.ok;
    } catch (error) {
        console.error("Authentication check failed:", error);
        return false;
    }
}

/**
 * Fetch the current user's profile
 */
export async function fetchProfile(): Promise<AuthUser | null> {
    const authApiUrl = getAuthApiUrl();

    try {
        const res = await fetch(`${authApiUrl}/auth/profile`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        return data.user;
    } catch (error) {
        console.error("Failed to fetch profile:", error);
        return null;
    }
}

/**
 * Authenticate the current user and fetch profile
 */
export async function authenticate(): Promise<AuthUser | null> {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return null;
    }

    // Note: Focus auth session should already be established during login
    // If it's not, user may need to re-login

    return await fetchProfile();
}

/**
 * Establish focus service authentication session using the auth token
 * This creates focus_sid and focus_csrf cookies for API access
 */
async function establishFocusAuthSession(authToken: string): Promise<void> {
    const focusApiUrl = getFocusApiUrl();

    if (!authToken) {
        throw new Error("No auth token provided");
    }

    const res = await fetch(`${focusApiUrl}/auth/session`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${authToken}`,
        },
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error(`Failed to establish focus auth session: ${res.status}`);
    }
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ user: AuthUser }> {
    const authApiUrl = getAuthApiUrl();

    const res = await fetch(`${authApiUrl}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(error.message || "Login failed");
    }

    // Response might be empty or contain user data
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    // Establish focus auth session after successful login (for API access, not tracking)
    if (data.token) {
        await establishFocusAuthSession(data.token).catch(err => {
            console.error("Failed to establish focus auth session:", err);
        });
    }

    return { user: data.user || data };
}

/**
 * Register a new user
 */
export async function register(email: string, password: string, name?: string): Promise<{ user: AuthUser }> {
    const authApiUrl = getAuthApiUrl();

    let res: Response;
    try {
        res = await fetch(`${authApiUrl}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password, name }),
            credentials: "include",
        });
    } catch {
        throw { code: "NETWORK_ERROR", message: "Cannot reach auth service. Please try again." } as AuthError;
    }

    if (!res.ok) {
        throw await buildAuthError(res, "Registration failed");
    }

    // Response might be empty or contain user data
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return { user: data.user || data };
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
    const authApiUrl = getAuthApiUrl();
    const focusApiUrl = getFocusApiUrl();

    try {
        // Logout from focus first
        await fetch(`${focusApiUrl}/auth/logout`, {
            method: "POST",
            credentials: "include",
        }).catch(err => console.error("Focus logout failed:", err));

        // Then logout from auth
        await fetch(`${authApiUrl}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch (error) {
        console.error("Logout request failed:", error);
    }
}
