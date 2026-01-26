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
    list: async () => {
        const response = await apiFetch<{ categories: Focus.Category[] }>("/categories");
        return response.categories;
    },

    create: (body: { name: string; color?: string }) =>
        apiFetch<void>("/categories/create", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    delete: (body: { categoryId: string }) =>
        apiFetch<void>(`/categories/delete?categoryId=${encodeURIComponent(body.categoryId)}`, {
            method: "POST",
        }),

    archive: (body: { categoryId: string }) =>
        apiFetch<void>(`/categories/archive?categoryId=${encodeURIComponent(body.categoryId)}`, {
            method: "POST",
        }),

    unarchive: (body: { categoryId: string }) =>
        apiFetch<void>(`/categories/unarchive?categoryId=${encodeURIComponent(body.categoryId)}`, {
            method: "POST",
        }),
};
