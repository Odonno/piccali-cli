import { atom } from "jotai";
import { metadataAtom, scenariosAtom } from "@/atoms/state";
import { analyzeScenarioOutlineImprovements } from "@/functions/scenarioImprovements";
import type { PiccaliMetadata } from "@/schemas/metadata";

/**
 * Scenario outline improvements are opt-in:
 * they only run when `features.scenarioOutlineImprovements` is explicitly true in metadata.json.
 */
export const scenarioOutlineImprovementsEnabled = (
	metadata: PiccaliMetadata | null,
): boolean => metadata?.features.scenarioOutlineImprovements === true;

export const scenarioImprovementsAtom = atom((get) => {
	if (!scenarioOutlineImprovementsEnabled(get(metadataAtom))) {
		return [];
	}
	const scenarios = get(scenariosAtom);
	return analyzeScenarioOutlineImprovements(scenarios);
});

export const warningScenariosAtom = atom((get) => {
	const improvements = get(scenarioImprovementsAtom);
	return new Set(improvements.map((i) => i.scenarioId));
});
