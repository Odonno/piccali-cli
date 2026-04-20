import type { Scenario } from "@/schemas/data";

export const isScenarioOutline = (scenario: Scenario): boolean =>
	scenario.keyword.includes("Outline");
