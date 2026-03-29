import { slugify } from "@/lib/utils";
import type { Feature, FolderNode, Rule } from "@/types/data";
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

/**
 * Build the URL path for a feature page.
 * Format: /features/<folder-slug>/.../<feature-slug>
 */
export const buildFeatureUrl = (
	folders: FolderNode[],
	path: FeaturePath,
): string => {
	const segments: string[] = [];
	let nodes = folders;
	let leafFolder: FolderNode | undefined;
	for (const idx of path.folderPath) {
		leafFolder = nodes[idx];
		if (!leafFolder) break;
		segments.push(slugify(leafFolder.name));
		nodes = leafFolder.folders ?? [];
	}
	const feature = leafFolder?.features?.[path.featureIndex];
	if (feature) {
		segments.push(slugify(featureLabel(feature)));
	}
	return `/features/${segments.join("/")}`;
};

/**
 * Build the URL path for a rule page.
 * Format: /features/<...>/rules/<rule-slug>
 */
export const buildRuleUrl = (
	folders: FolderNode[],
	path: FeaturePath,
	rule: Rule,
): string => {
	return `${buildFeatureUrl(folders, path)}/rules/${slugify(rule.name || rule.keyword)}`;
};

/**
 * Resolve a feature from the folder tree using URL slugs.
 * @param slugSegments - Array of slugs: [...folderSlugs, featureSlug]
 * Returns the feature and its FeaturePath, or undefined if not found.
 */
export const resolveFeatureBySlug = (
	folders: FolderNode[],
	slugSegments: string[],
): { feature: Feature; path: FeaturePath } | undefined => {
	if (slugSegments.length === 0) return undefined;

	const folderSlugs = slugSegments.slice(0, -1);
	const featureSlug = slugSegments[slugSegments.length - 1];

	let nodes = folders;
	const folderPath: number[] = [];

	for (const slug of folderSlugs) {
		const idx = nodes.findIndex((f) => slugify(f.name) === slug);
		if (idx === -1) return undefined;
		folderPath.push(idx);
		nodes = nodes[idx].folders ?? [];
	}

	// The last node's parent contains the features
	let featureNodes: Feature[] = [];
	if (folderPath.length > 0) {
		let leaf = folders[folderPath[0]];
		for (let i = 1; i < folderPath.length; i++) {
			leaf = leaf.folders?.[folderPath[i]] ?? leaf;
		}
		featureNodes = leaf.features ?? [];
	} else {
		// No folder path — features are in the top-level... but the data model
		// wraps everything in FolderNode. In practice, featureSlugs always has
		// at least one folder segment. Handle gracefully anyway.
		featureNodes = [];
	}

	const featureIndex = featureNodes.findIndex(
		(f) => slugify(featureLabel(f)) === featureSlug,
	);
	if (featureIndex === -1) return undefined;

	return {
		feature: featureNodes[featureIndex],
		path: { folderPath, featureIndex },
	};
};

/**
 * Resolve a rule from a feature using a rule slug.
 */
export const resolveRuleBySlug = (
	feature: Feature,
	ruleSlug: string,
): { rule: Rule; ruleIndex: number } | undefined => {
	const ruleIndex =
		feature.rules?.findIndex(
			(r) => slugify(r.name || r.keyword) === ruleSlug,
		) ?? -1;
	if (ruleIndex === -1 || !feature.rules) return undefined;
	return { rule: feature.rules[ruleIndex], ruleIndex };
};
