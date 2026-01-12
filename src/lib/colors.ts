export type ColorPresetKey =
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "cyan"
    | "blue"
    | "violet"
    | "pink"
    | "slate";

export interface ColorPreset {
    key: ColorPresetKey;
    name: string;
    hex: string;
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
    { key: "red", name: "Red", hex: "#ef4444" },
    { key: "orange", name: "Orange", hex: "#f97316" },
    { key: "yellow", name: "Yellow", hex: "#eab308" },
    { key: "green", name: "Green", hex: "#22c55e" },
    { key: "cyan", name: "Cyan", hex: "#06b6d4" },
    { key: "blue", name: "Blue", hex: "#3b82f6" },
    { key: "violet", name: "Violet", hex: "#8b5cf6" },
    { key: "pink", name: "Pink", hex: "#ec4899" },
    { key: "slate", name: "Slate", hex: "#64748b" },
] as const;
