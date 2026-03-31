import type { Feature, FolderNode, Step } from "@/types/data";

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
export const collectUniqueSteps = (folders: FolderNode[]): Step[] => {
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
	return unique;
};
