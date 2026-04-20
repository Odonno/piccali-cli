import type { Feature, FolderNode, Step } from "@/schemas/data";
import type { StepGroup } from "@/types/step";

/** Count all features (files) in a folder tree. */
export const countFeatures = (folders: FolderNode[]): number =>
	folders.reduce(
		(sum, folder) =>
			sum +
			(folder.features?.length ?? 0) +
			countFeatures(folder.folders ?? []),
		0,
	);

/** Count all scenarios in a feature (direct + inside rules). */
const featureTotalScenarios = (feature: Feature): number => {
	const direct = feature.scenarios?.length ?? 0;
	const fromRules =
		feature.rules?.reduce((sum, r) => sum + (r.scenarios?.length ?? 0), 0) ?? 0;
	return direct + fromRules;
};

/** Count all scenarios in a folder tree. */
export const countScenarios = (folders: FolderNode[]): number =>
	folders.reduce(
		(sum, folder) =>
			sum +
			(folder.features?.reduce((s, f) => s + featureTotalScenarios(f), 0) ??
				0) +
			countScenarios(folder.folders ?? []),
		0,
	);

/** Count scenario outlines (keyword contains "Outline") in a feature. */
const featureOutlineCount = (feature: Feature): number => {
	const fromDirect =
		feature.scenarios?.filter((s) => s.keyword.includes("Outline")).length ?? 0;
	const fromRules =
		feature.rules?.reduce(
			(sum, r) =>
				sum +
				(r.scenarios?.filter((s) => s.keyword.includes("Outline")).length ?? 0),
			0,
		) ?? 0;
	return fromDirect + fromRules;
};

/** Count all scenario outlines in a folder tree. */
export const countScenarioOutlines = (folders: FolderNode[]): number =>
	folders.reduce(
		(sum, folder) =>
			sum +
			(folder.features?.reduce((s, f) => s + featureOutlineCount(f), 0) ?? 0) +
			countScenarioOutlines(folder.folders ?? []),
		0,
	);

/** Collect all unique steps across the entire folder tree, deduplicated by (text + type). */
export const collectUniqueSteps = (folders: FolderNode[]): StepGroup[] => {
	// --- Pass 1: collect all unique (type, text) pairs ---
	const seen = new Set<string>();
	const unique: Step[] = [];

	const visit = (step: Step) => {
		const key = `${step.type}:${step.text}`;
		if (!seen.has(key)) {
			seen.add(key);
			unique.push(step);
		}
	};

	const visitFolders = (nodes: FolderNode[]) => {
		for (const folder of nodes) {
			for (const feature of folder.features ?? []) {
				for (const step of feature.background?.steps ?? []) visit(step);
				for (const scenario of feature.scenarios ?? []) {
					for (const step of scenario.steps) visit(step);
				}
				for (const rule of feature.rules ?? []) {
					for (const step of rule.background?.steps ?? []) visit(step);
					for (const scenario of rule.scenarios ?? []) {
						for (const step of scenario.steps) visit(step);
					}
				}
			}
			visitFolders(folder.folders ?? []);
		}
	};

	visitFolders(folders);

	// --- Pass 2: group by (type, pattern) ---
	// Replace varying tokens with placeholders to produce a grouping pattern.
	// Order matters: dates must be substituted before bare numbers so that
	// digit sequences inside date literals are not consumed first.
	const toPattern = (text: string): string =>
		text
			// Quoted strings: "foo" → "(.+)"
			.replace(/"[^"]*"/g, '"(.+)"')
			// ISO dates: 2020-03-10 → (\\d{4}-\\d{2}-\\d{2})
			.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "(\\d{4}-\\d{2}-\\d{2})")
			// European dates: 10/03/2020 → (\\d{2}/\\d{2}/\\d{4})
			.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "(\\d{2}/\\d{2}/\\d{4})")
			// Standalone integers/decimals not already inside a placeholder
			.replace(/\b\d+(\.\d+)?\b/g, "(\\d+)");

	// Build a slug id from type + pattern (deterministic, human-readable).
	const toSlug = (type: string, pattern: string): string =>
		`${type}-${pattern}`
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

	const groupMap = new Map<string, StepGroup>();

	for (const step of unique) {
		const pattern = toPattern(step.text);
		const groupKey = `${step.type}:${pattern}`;

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
