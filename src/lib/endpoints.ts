import { apiFetch } from "@/lib/api"

/* =======================
   Sessions
   ======================= */

export const sessionsApi = {
    running: () =>
        apiFetch<Focus.FocusSession | null>("/sessions/running"),

    start: () =>
        apiFetch<void>("/sessions/start", { method: "POST" }),

    resume: () =>
        apiFetch<void>("/sessions/resume", { method: "POST" }),

    stop: () =>
        apiFetch<void>("/sessions/stop", { method: "POST" }),
};

/* =======================
   Categories
   ======================= */

export const categoriesApi = {
    list: () =>
        apiFetch<Focus.Category[]>("/categories/list"),

    create: (body: { name: string; color?: string }) =>
        apiFetch<void>("/categories/create", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    delete: (body: { categoryId: string }) =>
        apiFetch<void>("/categories/delete", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    archive: (body: { categoryId: string }) =>
        apiFetch<void>("/categories/archive", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    unarchive: (body: { categoryId: string }) =>
        apiFetch<void>("/categories/unarchive", {
            method: "POST",
            body: JSON.stringify(body),
        }),
};
