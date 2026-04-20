import type { StepType, Step } from "@/schemas/data";

/**
 * A group of steps that match the same regex pattern.
 * When only one unique step text exists, `pattern` equals the original text
 * and `matches` contains only that one step. When multiple steps share the
 * same structure (differing only in quoted-string values), `pattern` is a
 * regex-like string with `(.+)` placeholders and `matches` holds all of them.
 */
export type StepGroup = {
	id: string;
	type: StepType;
	/** Regex-like string with `(.+)` in place of varying quoted values. */
	pattern: string;
	/** All original steps that belong to this group (length >= 1). */
	matches: Step[];
};
