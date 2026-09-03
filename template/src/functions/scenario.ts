import type { Scenario } from "@/schemas/data";

/**
 * A scenario is an outline if it has example tables.
 * Language-agnostic: keyword text ("Scenario Outline", "Plan du scénario", …)
 * varies per Gherkin dialect, but examples only exist on outlines.
 */
export const isScenarioOutline = (scenario: Scenario): boolean =>
	(scenario.examples?.length ?? 0) > 0;
