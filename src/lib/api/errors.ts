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

/**
 * Map API error to user-friendly message
 */
export function mapApiErrorToMessage(error: unknown, fallback: string = "Operation failed. Please try again."): string {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 400:
                // Validation error - try to extract details
                if (error.details && typeof error.details === "object" && "message" in error.details) {
                    return (error.details as any).message;
                }
                return "Invalid input. Please check your data.";
            case 401:
                return "Access denied. Please log in again.";
            case 409:
                // Conflict - e.g. duplicate name
                if (error.details && typeof error.details === "object" && "message" in error.details) {
                    return (error.details as any).message;
                }
                return "This item already exists.";
            case 403:
                return "You don't have permission to do this.";
            case 404:
                return "Item not found.";
            case 500:
            case 502:
            case 503:
                return "Server error. Please try again later.";
            default:
                return error.message || fallback;
        }
    }

    if (error instanceof Error) {
        if (error.message.includes("fetch")) {
            return "Cannot reach server. Please check your connection.";
        }
        return error.message;
    }

    return fallback;
}
