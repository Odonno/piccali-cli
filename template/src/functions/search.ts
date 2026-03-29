import type { FolderNode, Tag } from "@/types/data";
import type { FeaturePath, SelectedFeature } from "@/types/navigation";
import type { SearchResult, SearchResultKind } from "@/types/search";

const MAX_RESULTS = 50;

const normStr = (s: string): string => s.toLowerCase();

const matchesQuery = (text: string, query: string): boolean =>
	normStr(text).includes(query);

/**
 * Normalises a tag query: strips a leading "@" so that both "@smoke" and
 * "smoke" match tag names stored without the "@" prefix.
 */
const normaliseTagQuery = (query: string): string =>
	query.startsWith("@") ? query.slice(1) : query;

/**
 * Returns true when `tag.name` matches `query` either as a plain substring
 * or via a tag-prefixed "@…" lookup.
 */
const tagMatchesQuery = (tag: Tag, query: string): boolean => {
	// Always attempt a plain substring match against the raw tag name
	if (matchesQuery(tag.name, query)) return true;
	// If the query starts with "@", also try matching the query without "@"
	const stripped = normaliseTagQuery(query);
	if (stripped !== query) {
		return matchesQuery(tag.name, stripped);
	}
	return false;
};

/**
 * Search all features, scenarios, steps, and tags in the folder tree.
 * Returns up to MAX_RESULTS results, sorted: features → scenarios → steps → tags.
 */
export const searchData = (
	folders: FolderNode[],
	rawQuery: string,
): SearchResult[] => {
	const query = normStr(rawQuery.trim());
	if (!query) return [];

	const featureResults: SearchResult[] = [];
	const scenarioResults: SearchResult[] = [];
	const stepResults: SearchResult[] = [];
	const tagResults: SearchResult[] = [];

	const walkFolders = (
		nodes: FolderNode[],
		folderPath: number[],
		breadcrumbParts: string[],
	): void => {
		for (let fi = 0; fi < nodes.length; fi++) {
			const folder = nodes[fi];
			const currentPath = [...folderPath, fi];
			const currentBreadcrumb = [...breadcrumbParts, folder.name];

			// Recurse into sub-folders
			if (folder.folders?.length) {
				walkFolders(folder.folders, currentPath, currentBreadcrumb);
			}

			// Walk features in this folder
			const features = folder.features ?? [];
			for (let featureIdx = 0; featureIdx < features.length; featureIdx++) {
				const feature = features[featureIdx];
				const featurePath: FeaturePath = {
					folderPath: currentPath,
					featureIndex: featureIdx,
				};
				const featureBreadcrumb = currentBreadcrumb.join(" / ");
				const featureLabel = feature.name || feature.keyword;
				const featureSelection: SelectedFeature = {
					type: "feature",
					path: featurePath,
				};

				// --- Feature name match ---
				if (matchesQuery(featureLabel, query)) {
					featureResults.push({
						kind: "feature",
						label: featureLabel,
						breadcrumb: featureBreadcrumb,
						matchText: featureLabel,
						selection: featureSelection,
					});
				}

				// --- Feature description match ---
				if (
					feature.description &&
					matchesQuery(feature.description, query) &&
					!matchesQuery(featureLabel, query)
				) {
					featureResults.push({
						kind: "feature",
						label: featureLabel,
						breadcrumb: featureBreadcrumb,
						matchText: feature.description,
						selection: featureSelection,
					});
				}

				// --- Feature tag matches ---
				for (const tag of feature.tags ?? []) {
					if (tagMatchesQuery(tag, query)) {
						tagResults.push({
							kind: "tag",
							label: featureLabel,
							breadcrumb: featureBreadcrumb,
							matchText: tag.name,
							matchedTag: tag,
							selection: featureSelection,
						});
					}
				}

				// Collect all scenarios: direct + from rules
				const allScenarioSources: Array<{
					scenarios: typeof feature.scenarios;
					selection: SelectedFeature;
					ruleLabel?: string;
				}> = [];

				// Direct scenarios on the feature
				if ((feature.scenarios?.length ?? 0) > 0) {
					allScenarioSources.push({
						scenarios: feature.scenarios,
						selection: featureSelection,
					});
				}

				// Scenarios and tags inside each rule
				const rules = feature.rules ?? [];
				for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
					const rule = rules[ruleIdx];
					const ruleSelection: SelectedFeature = {
						type: "rule",
						path: featurePath,
						ruleIndex: ruleIdx,
					};
					const ruleLabel = rule.name || rule.keyword;

					// Rule tag matches
					for (const tag of rule.tags ?? []) {
						if (tagMatchesQuery(tag, query)) {
							tagResults.push({
								kind: "tag",
								label: ruleLabel,
								breadcrumb: `${featureBreadcrumb} / ${featureLabel}`,
								matchText: tag.name,
								matchedTag: tag,
								selection: ruleSelection,
							});
						}
					}

					if ((rule.scenarios?.length ?? 0) > 0) {
						allScenarioSources.push({
							scenarios: rule.scenarios,
							selection: ruleSelection,
							ruleLabel,
						});
					}
				}

				// Walk scenario sources
				for (const source of allScenarioSources) {
					const scenarios = source.scenarios ?? [];
					for (const scenario of scenarios) {
						const scenarioName = scenario.name || scenario.keyword;
						const scenarioBreadcrumb = source.ruleLabel
							? `${featureBreadcrumb} / ${featureLabel} / ${source.ruleLabel}`
							: `${featureBreadcrumb} / ${featureLabel}`;

						// --- Scenario name match ---
						if (matchesQuery(scenarioName, query)) {
							scenarioResults.push({
								kind: "scenario",
								label: scenarioName,
								breadcrumb: scenarioBreadcrumb,
								matchText: scenarioName,
								selection: source.selection,
							});
						}

						// --- Scenario tag matches ---
						for (const tag of scenario.tags ?? []) {
							if (tagMatchesQuery(tag, query)) {
								tagResults.push({
									kind: "tag",
									label: scenarioName,
									breadcrumb: scenarioBreadcrumb,
									matchText: tag.name,
									matchedTag: tag,
									selection: source.selection,
								});
							}
						}

						// --- Examples tag matches ---
						for (const examples of scenario.examples ?? []) {
							for (const tag of examples.tags ?? []) {
								if (tagMatchesQuery(tag, query)) {
									tagResults.push({
										kind: "tag",
										label: scenarioName,
										breadcrumb: scenarioBreadcrumb,
										matchText: tag.name,
										matchedTag: tag,
										selection: source.selection,
									});
								}
							}
						}

						// --- Step text match ---
						const steps = scenario.steps ?? [];
						for (const step of steps) {
							if (matchesQuery(step.text, query)) {
								stepResults.push({
									kind: "step",
									label: `${step.keyword.trim()} ${step.text}`,
									breadcrumb: scenarioBreadcrumb,
									matchText: step.text,
									scenarioName,
									selection: source.selection,
								});
							}
						}
					}
				}

				// Walk background steps (feature level)
				const bgSteps = feature.background?.steps ?? [];
				for (const step of bgSteps) {
					if (matchesQuery(step.text, query)) {
						stepResults.push({
							kind: "step",
							label: `${step.keyword.trim()} ${step.text}`,
							breadcrumb: featureBreadcrumb,
							matchText: step.text,
							scenarioName: "Background",
							selection: featureSelection,
						});
					}
				}
			}
		}
	};

	walkFolders(folders, [], []);

	const combined = [
		...featureResults,
		...scenarioResults,
		...stepResults,
		...tagResults,
	];

	return combined.slice(0, MAX_RESULTS);
};

/**
 * Splits `text` into parts: non-matching and matching segments.
 * Returns array of { text, highlight } objects for rendering.
 */
export const highlightMatches = (
	text: string,
	query: string,
): Array<{ text: string; highlight: boolean }> => {
	// Normalise tag queries for highlight matching too
	const normQuery = normStr(
		query.startsWith("@") ? query.slice(1) : query,
	).trim();
	if (!normQuery) return [{ text, highlight: false }];
	const lower = normStr(text);
	const parts: Array<{ text: string; highlight: boolean }> = [];
	let cursor = 0;

	while (cursor < text.length) {
		const idx = lower.indexOf(normQuery, cursor);
		if (idx === -1) {
			parts.push({ text: text.slice(cursor), highlight: false });
			break;
		}
		if (idx > cursor) {
			parts.push({ text: text.slice(cursor, idx), highlight: false });
		}
		parts.push({
			text: text.slice(idx, idx + normQuery.length),
			highlight: true,
		});
		cursor = idx + normQuery.length;
	}

	return parts;
};

export type { SearchResultKind, SearchResult };
