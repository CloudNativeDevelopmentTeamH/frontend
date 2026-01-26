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
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<boolean> {
    const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || "http://localhost:4000";

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
    const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || "http://localhost:4000";

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
    const focusApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8088";

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
    const focusApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8088";

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
