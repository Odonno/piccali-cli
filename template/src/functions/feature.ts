import { slugify } from "@/lib/utils";
import type { Feature, FolderNode, Rule } from "@/schemas/data";
import type { FeaturePath, SelectedFeature } from "@/types/navigation";

export const ruleHasWarnings = (
	rule: Rule,
	warningScenarioIds: Set<string>,
): boolean =>
	rule.scenarios?.some((s) => warningScenarioIds.has(s.id)) ?? false;

export const featureHasWarnings = (
	feature: Feature,
	warningScenarioIds: Set<string>,
): boolean => {
	if (feature.scenarios?.some((s) => warningScenarioIds.has(s.id))) {
		return true;
	}
	return (
		feature.rules?.some((r) => ruleHasWarnings(r, warningScenarioIds)) ?? false
	);
};

export const folderHasWarnings = (
	folder: FolderNode,
	warningScenarioIds: Set<string>,
): boolean => {
	if (folder.features?.some((f) => featureHasWarnings(f, warningScenarioIds))) {
		return true;
	}
	return (
		folder.folders?.some((f) => folderHasWarnings(f, warningScenarioIds)) ??
		false
	);
};

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

/**
 * Sibling-aware URL slug: `slugify(label)`, plus `-<id>` when another sibling
 * slugifies to the same value (ids are baked into the JSON by the generator).
 * Falls back to the bare slug when the id is missing (older data) — same
 * behaviour as before this disambiguation existed.
 * ponytail: O(n²) slugify over siblings — fine for folder-sized lists.
 */
const urlSlugOf = <T>(
	siblings: T[],
	item: T,
	labelOf: (item: T) => string,
	idOf: (item: T) => string | undefined,
): string => {
	const base = slugify(labelOf(item));
	const id = idOf(item);
	if (
		!id ||
		!siblings.some(
			(other) => other !== item && slugify(labelOf(other)) === base,
		)
	) {
		return base;
	}
	return `${base}-${id}`;
};

const folderUrlSlug = (folders: FolderNode[], folder: FolderNode): string =>
	urlSlugOf(
		folders,
		folder,
		(f) => f.name,
		(f) => f.id,
	);

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
		segments.push(folderUrlSlug(nodes, leafFolder));
		nodes = leafFolder.folders ?? [];
	}
	const features = leafFolder?.features ?? [];
	const feature = features[path.featureIndex];
	if (feature) {
		segments.push(urlSlugOf(features, feature, featureLabel, (f) => f.id));
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
	feature: Feature,
	rule: Rule,
): string => {
	const rules = feature.rules ?? [];
	const ruleSlug = urlSlugOf(
		rules,
		rule,
		(r) => r.name || r.keyword,
		(r) => r.id,
	);
	return `${buildFeatureUrl(folders, path)}/rules/${ruleSlug}`;
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
		const idx = nodes.findIndex((f) => folderUrlSlug(nodes, f) === slug);
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
		(f) =>
			urlSlugOf(featureNodes, f, featureLabel, (x) => x.id) === featureSlug,
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
	const rules = feature.rules ?? [];
	const ruleIndex = rules.findIndex(
		(r) =>
			urlSlugOf(
				rules,
				r,
				(x) => x.name || x.keyword,
				(x) => x.id,
			) === ruleSlug,
	);
	if (ruleIndex === -1) return undefined;
	return { rule: rules[ruleIndex], ruleIndex };
};
