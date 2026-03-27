import type { FolderNode } from "@/lib/types";
import type { FeaturePath, SelectedFeature } from "@/components/AppSidebar";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type SearchResultKind = "feature" | "scenario" | "step";

export type SearchResult = {
  kind: SearchResultKind;
  /** Human-readable label for the match (feature name, scenario name, step text) */
  label: string;
  /** Context: folder path as breadcrumb string, e.g. "Administration / Login" */
  breadcrumb: string;
  /** What to navigate to when this result is activated */
  selection: SelectedFeature;
  /** Scenario name — present when kind is "step" */
  scenarioName?: string;
  /** The exact matched text fragment to highlight */
  matchText: string;
};

// ---------------------------------------------------------------------------
// Search implementation
// ---------------------------------------------------------------------------

const MAX_RESULTS = 50;

function normStr(s: string): string {
  return s.toLowerCase();
}

function matchesQuery(text: string, query: string): boolean {
  return normStr(text).includes(query);
}

/**
 * Search all features, scenarios, and steps in the folder tree.
 * Returns up to MAX_RESULTS results, sorted: features first, then scenarios, then steps.
 */
export function searchData(
  folders: FolderNode[],
  rawQuery: string,
): SearchResult[] {
  const query = normStr(rawQuery.trim());
  if (!query) return [];

  const featureResults: SearchResult[] = [];
  const scenarioResults: SearchResult[] = [];
  const stepResults: SearchResult[] = [];

  function walkFolders(
    nodes: FolderNode[],
    folderPath: number[],
    breadcrumbParts: string[],
  ): void {
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

        // --- Feature name match ---
        const featureLabel = feature.name || feature.keyword;
        if (matchesQuery(featureLabel, query)) {
          featureResults.push({
            kind: "feature",
            label: featureLabel,
            breadcrumb: featureBreadcrumb,
            matchText: featureLabel,
            selection: { type: "feature", path: featurePath },
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
            selection: { type: "feature", path: featurePath },
          });
        }

        // Collect all scenarios: direct + from rules
        const allScenarioSources: Array<{
          scenarios: typeof feature.scenarios;
          selection: SelectedFeature;
        }> = [];

        // Direct scenarios on the feature
        if ((feature.scenarios?.length ?? 0) > 0) {
          allScenarioSources.push({
            scenarios: feature.scenarios,
            selection: { type: "feature", path: featurePath },
          });
        }

        // Scenarios inside each rule
        const rules = feature.rules ?? [];
        for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
          const rule = rules[ruleIdx];
          if ((rule.scenarios?.length ?? 0) > 0) {
            allScenarioSources.push({
              scenarios: rule.scenarios,
              selection: { type: "rule", path: featurePath, ruleIndex: ruleIdx },
            });
          }
        }

        // Walk scenario sources
        for (const source of allScenarioSources) {
          const scenarios = source.scenarios ?? [];
          for (const scenario of scenarios) {
            const scenarioName = scenario.name || scenario.keyword;

            // --- Scenario name match ---
            if (matchesQuery(scenarioName, query)) {
              scenarioResults.push({
                kind: "scenario",
                label: scenarioName,
                breadcrumb: `${featureBreadcrumb} / ${featureLabel}`,
                matchText: scenarioName,
                selection: source.selection,
              });
            }

            // --- Step text match ---
            const steps = scenario.steps ?? [];
            for (const step of steps) {
              if (matchesQuery(step.text, query)) {
                stepResults.push({
                  kind: "step",
                  label: `${step.keyword.trim()} ${step.text}`,
                  breadcrumb: `${featureBreadcrumb} / ${featureLabel}`,
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
              breadcrumb: `${featureBreadcrumb} / ${featureLabel}`,
              matchText: step.text,
              scenarioName: "Background",
              selection: { type: "feature", path: featurePath },
            });
          }
        }
      }
    }
  }

  walkFolders(folders, [], []);

  const combined = [
    ...featureResults,
    ...scenarioResults,
    ...stepResults,
  ];

  return combined.slice(0, MAX_RESULTS);
}

// ---------------------------------------------------------------------------
// Highlight helper
// ---------------------------------------------------------------------------

/**
 * Splits `text` into parts: non-matching and matching segments.
 * Returns array of { text, highlight } objects for rendering.
 */
export function highlightMatches(
  text: string,
  query: string,
): Array<{ text: string; highlight: boolean }> {
  if (!query.trim()) return [{ text, highlight: false }];
  const lower = normStr(text);
  const lowerQuery = normStr(query.trim());
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const idx = lower.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      parts.push({ text: text.slice(cursor), highlight: false });
      break;
    }
    if (idx > cursor) {
      parts.push({ text: text.slice(cursor, idx), highlight: false });
    }
    parts.push({
      text: text.slice(idx, idx + lowerQuery.length),
      highlight: true,
    });
    cursor = idx + lowerQuery.length;
  }

  return parts;
}
