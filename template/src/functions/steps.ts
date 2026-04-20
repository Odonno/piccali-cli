import type { FolderNode, Step } from "@/schemas/data";
import type { StepGroup } from "@/types/steps";

/**
 * Replace varying tokens in a step text with regex-like placeholders.
 *
 * Strategy: collect all substitutions in order of precedence using a single
 * pass with a combined regex so that already-replaced segments are never
 * re-processed by a later rule.
 *
 * Priority (first match wins at any position):
 *  1. Quoted strings   "foo"         → "(.+)"
 *  2. ISO dates        2020-03-10    → (\d{4}-\d{2}-\d{2})
 *  3. European dates   10/03/2020    → (\d{2}/\d{2}/\d{4})
 *  4. Integers/floats  42 / 3.14     → (\d+)
 */
export const toPattern = (text: string): string =>
	text.replace(
		/"[^"]*"|\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b|\b\d+(?:\.\d+)?\b/g,
		(match) => {
			if (match.startsWith('"')) {
				return '"(.+)"';
			}
			if (/^\d{4}-\d{2}-\d{2}$/.test(match)) {
				return "(\\d{4}-\\d{2}-\\d{2})";
			}
			if (/^\d{2}\/\d{2}\/\d{4}$/.test(match)) {
				return "(\\d{2}/\\d{2}/\\d{4})";
			}
			return "(\\d+)";
		},
	);

/**
 * Replace each regex-like placeholder in a pattern with $1, $2, ... so that
 * two patterns that differ only in their placeholder kinds still produce
 * distinct, human-readable slugs.
 */
export const normalizePlaceholders = (pattern: string): string => {
	let counter = 0;

	return pattern.replace(/\([^)]+\)/g, () => {
		counter += 1;
		return `$${counter}`;
	});
};

/**
 * Build a deterministic, human-readable slug from a step type and its pattern.
 * Placeholders like (.+) or (\d+) are first converted to $1, $2, … so that
 * patterns with and without variables produce distinct slugs.
 */
export const toSlug = (type: string, pattern: string): string =>
	`${type}-${normalizePlaceholders(pattern)}`
		.toLowerCase()
		.replace(/[^a-z0-9$]+/g, "-")
		.replace(/^-+|-+$/g, "");

/** Visit a single step and register it in the seen set / unique list. */
const visitStep = (step: Step, seen: Set<string>, unique: Step[]): void => {
	const key = `${step.type}:${step.text}`;

	if (!seen.has(key)) {
		seen.add(key);
		unique.push(step);
	}
};

/** Recursively collect all unique (type, text) steps from a folder tree. */
export const collectUniqueStepsFromFolders = (
	folders: FolderNode[],
	seen: Set<string> = new Set<string>(),
	unique: Step[] = [],
): Step[] => {
	for (const folder of folders) {
		for (const feature of folder.features ?? []) {
			for (const step of feature.background?.steps ?? []) {
				visitStep(step, seen, unique);
			}

			for (const scenario of feature.scenarios ?? []) {
				for (const step of scenario.steps) {
					visitStep(step, seen, unique);
				}
			}

			for (const rule of feature.rules ?? []) {
				for (const step of rule.background?.steps ?? []) {
					visitStep(step, seen, unique);
				}

				for (const scenario of rule.scenarios ?? []) {
					for (const step of scenario.steps) {
						visitStep(step, seen, unique);
					}
				}
			}
		}

		collectUniqueStepsFromFolders(folder.folders ?? [], seen, unique);
	}

	return unique;
};

/** Group a flat list of unique steps by (type, pattern) into StepGroups. */
export const groupStepsByPattern = (unique: Step[]): StepGroup[] => {
	const groupMap = new Map<string, StepGroup>();

	for (const step of unique) {
		const pattern = toPattern(step.text);
		const slug = toSlug(step.type, pattern);
		const groupKey = slug;

		const existing = groupMap.get(groupKey);
		if (existing) {
			existing.matches.push(step);
		} else {
			groupMap.set(groupKey, {
				id: toSlug(step.type, pattern),
				type: step.type,
				pattern,
				matches: [step],
			});
		}
	}

	return Array.from(groupMap.values());
};

/** Collect all unique steps across the entire folder tree, deduplicated by (text + type). */
export const collectUniqueSteps = (folders: FolderNode[]): StepGroup[] => {
	const seen = new Set<string>();
	const unique = collectUniqueStepsFromFolders(folders, seen);

	return groupStepsByPattern(unique);
};
