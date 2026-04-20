import { atom } from "jotai";
import { scenariosAtom } from "@/atoms/state";
import { analyzeScenarioOutlineImprovements } from "@/functions/scenarioImprovements";

export const scenarioImprovementsAtom = atom((get) => {
	const scenarios = get(scenariosAtom);
	return analyzeScenarioOutlineImprovements(scenarios);
});
