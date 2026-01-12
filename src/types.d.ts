export { };

declare global {
    namespace Focus {
        type Id = string;

        type CategoryId = Id;
        type SessionId = Id;

        interface Category {
            id: CategoryId;
            name: string;
            color: string;
            archived: boolean;
        }

        interface FocusSession {
            id: SessionId;
            startAt: string; // ISO-8601
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
}
