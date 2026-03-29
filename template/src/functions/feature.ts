import type { Feature, FolderNode } from "@/types/data";
import type { FeaturePath, SelectedFeature } from "@/types/navigation";

export const featureScenarioCount = (feature: Feature): number => {
	const direct = feature.scenarios?.length ?? 0;
	const fromRules =
		feature.rules?.reduce((sum, r) => sum + (r.scenarios?.length ?? 0), 0) ?? 0;
	return direct + fromRules;
};

export const folderTotalScenarioCount = (folder: FolderNode): number => {
	const fromFeatures =
		folder.features?.reduce((sum, f) => sum + featureScenarioCount(f), 0) ?? 0;
	const fromSubFolders =
		folder.folders?.reduce((sum, f) => sum + folderTotalScenarioCount(f), 0) ??
		0;
	return fromFeatures + fromSubFolders;
};

export const featureLabel = (feature: Feature): string =>
	feature.name || feature.keyword;

export const isSameFeaturePath = (a: FeaturePath, b: FeaturePath): boolean =>
	a.featureIndex === b.featureIndex &&
	a.folderPath.length === b.folderPath.length &&
	a.folderPath.every((v, i) => v === b.folderPath[i]);

export const isFeatureSelected = (
	selected: SelectedFeature | null,
	path: FeaturePath,
): boolean => selected !== null && isSameFeaturePath(selected.path, path);

export const isRuleSelected = (
	selected: SelectedFeature | null,
	path: FeaturePath,
	ruleIndex: number,
): boolean =>
	selected?.type === "rule" &&
	isSameFeaturePath(selected.path, path) &&
	selected.ruleIndex === ruleIndex;

export const folderKey = (folderPath: number[]): string => folderPath.join(".");

export const countFeaturesInFolders = (folders: FolderNode[]): number =>
	folders.reduce(
		(sum, folder) =>
			sum +
			(folder.features?.length ?? 0) +
			countFeaturesInFolders(folder.folders ?? []),
		0,
	);

/** Resolve a feature from the folder tree using a folderPath + featureIndex. */
export const resolveFeature = (
	folders: FolderNode[],
	folderPath: number[],
	featureIndex: number,
): Feature | undefined => {
	let leaf: FolderNode | undefined;
	let nodes = folders;
	for (const idx of folderPath) {
		leaf = nodes[idx];
		if (!leaf) return undefined;
		nodes = leaf.folders ?? [];
	}
	return leaf?.features?.[featureIndex];
};
