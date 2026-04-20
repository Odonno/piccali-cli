import type { StepType } from "@/schemas/data";

export const ALL_STEP_TYPES: StepType[] = ["Given", "When", "Then"];

/**
 * Distinctive OKLCH colors per variant — scoped to this page only.
 * bg/text are used on the badge; border is used on the row left accent.
 * All values chosen to be perceptually distinct and readable in both light and dark mode.
 */
export const STEP_TYPE_COLORS: Record<
	StepType,
	{ bg: string; text: string; border: string; dimBg: string }
> = {
	Given: {
		bg: "oklch(0.65 0.17 155)", // emerald green
		text: "oklch(0.97 0.02 155)",
		border: "oklch(0.65 0.17 155)",
		dimBg: "oklch(0.65 0.17 155 / 8%)",
	},
	When: {
		bg: "oklch(0.72 0.17 55)", // amber
		text: "oklch(0.18 0.04 55)",
		border: "oklch(0.72 0.17 55)",
		dimBg: "oklch(0.72 0.17 55 / 8%)",
	},
	Then: {
		bg: "oklch(0.58 0.22 280)", // violet
		text: "oklch(0.97 0.02 280)",
		border: "oklch(0.58 0.22 280)",
		dimBg: "oklch(0.58 0.22 280 / 8%)",
	},
};

export const STEP_TYPE_ORDER: Record<StepType, number> = {
	Given: 0,
	When: 1,
	Then: 2,
};
