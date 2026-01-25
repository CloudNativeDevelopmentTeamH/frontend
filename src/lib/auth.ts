/**
 * Auth utility functions
 * Note: Backend uses cookie-based authentication
 */

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
}

/**
 * Authenticate the current user with the stored token
 */
export async function authenticate(): Promise<AuthUser | null> {
    const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || "http://localhost:4000";

    try {
        const res = await fetch(`${authApiUrl}/auth/authenticate`, {
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
        return data.user || data;
    } catch (error) {
        console.error("Authentication failed:", error);
        return null;
    }
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ user: AuthUser }> {
    const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || "http://localhost:4000";

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
    return { user: data.user || data };
}

/**
 * Register a new user
 */
export async function register(email: string, password: string, name?: string): Promise<{ user: AuthUser }> {
    const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || "http://localhost:4000";

    const res = await fetch(`${authApiUrl}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
        credentials: "include",
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(error.message || "Registration failed");
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
    const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || "http://localhost:4000";

    try {
        await fetch(`${authApiUrl}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch (error) {
        console.error("Logout request failed:", error);
    }
}
