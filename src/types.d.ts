export { };

declare global {
    namespace Focus {
        type Id = string;

        type CategoryId = Id;
        type SessionId = Id;

        interface Category {
            categoryId: CategoryId;
            name: string;
            color: string;
            archived: boolean;
        }

        interface FocusSession {
            sessionId: SessionId;
            startedAt: string; // ISO-8601
            endAt?: string | null; // ISO-8601 or null
            categoryId?: CategoryId | null;
            note?: string | null;

            [k: string]: unknown;
        }

        interface ApiErrorPayload {
            message?: string;
            code?: string;
            details?: unknown;
        }
    }
    namespace Api {
        type FetchOptions = RequestInit & {
            // Override (ENV default)
            baseUrl?: string;
        };
    }
}
