import type { Tag } from "@/schemas/data";
import type { SelectedFeature } from "@/types/navigation";

export type SearchResultKind = "feature" | "scenario" | "step" | "tag";

export type SearchResult = {
	kind: SearchResultKind;
	/** Human-readable label for the match (feature name, scenario name, step text, tag name) */
	label: string;
	/** Context: folder path as breadcrumb string, e.g. "Administration / Login" */
	breadcrumb: string;
	/** What to navigate to when this result is activated */
	selection: SelectedFeature;
	/** Scenario name — present when kind is "step" */
	scenarioName?: string;
	/** The exact matched text fragment to highlight */
	matchText: string;
	/** Matched tag — present when kind is "tag" */
	matchedTag?: Tag;
};
