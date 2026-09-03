import { describe, expect, test } from "vitest";
import { analyzeScenarioOutlineImprovements } from "./scenarioImprovements";
import type { Scenario, Step } from "@/schemas/data";
import { v4 as uuidv4 } from "uuid";

const buildSteps = (action: string, message: string): Step[] => [
	{ id: uuidv4(), keyword: "Given", type: "Given", text: "I start the app" },
	{ id: uuidv4(), keyword: "When", type: "When", text: `I do "${action}"` },
	{
		id: uuidv4(),
		keyword: "Then",
		type: "Then",
		text: `I see an error message "${message}"`,
	},
];

const buildScenario = (
	name: string,
	action: string,
	message: string,
): Scenario => ({
	id: uuidv4(),
	keyword: "Scenario",
	name,
	steps: buildSteps(action, message),
});

describe("analyzeScenarioOutlineImprovements", () => {
	test("joins localized outline (French Plan du scénario) like an English one", () => {
		const outline: Scenario = {
			id: uuidv4(),
			keyword: "Plan du scénario",
			name: "Erreurs par action",
			steps: [
				{
					id: uuidv4(),
					keyword: "Étant donné ",
					type: "Given",
					text: "je démarre l'application",
				},
				{
					id: uuidv4(),
					keyword: "Quand ",
					type: "When",
					text: 'je fais "<action>"',
				},
				{
					id: uuidv4(),
					keyword: "Alors ",
					type: "Then",
					text: 'je vois un message d\'erreur "<message>"',
				},
			],
			examples: [
				{
					keyword: "Exemples",
					table: { header: ["action", "message"], rows: [["X", "M"]] },
				},
			],
		};

		const scenario: Scenario = {
			...buildScenario("B", "X", "M"),
			steps: [
				{
					id: uuidv4(),
					keyword: "Étant donné ",
					type: "Given",
					text: "je démarre l'application",
				},
				{
					id: uuidv4(),
					keyword: "Quand ",
					type: "When",
					text: 'je fais "X"',
				},
				{
					id: uuidv4(),
					keyword: "Alors ",
					type: "Then",
					text: 'je vois un message d\'erreur "M"',
				},
			],
		};
		const improvements = analyzeScenarioOutlineImprovements([
			outline,
			scenario,
		]);
		expect(improvements[0]).toEqual({
			scenarioId: scenario.id,
			outlineId: outline.id,
		});
	});

	test("flags regular scenarios that can be grouped into outline", () => {
		const scenarioA = buildScenario("A", "X", "M");
		const scenarioB = buildScenario("B", "Y", "W");
		const scenarios: Scenario[] = [scenarioA, scenarioB];

		const improvements = analyzeScenarioOutlineImprovements(scenarios);

		expect(improvements).toHaveLength(2);
		expect(improvements[0]).toEqual({
			scenarioId: scenarioA.id,
			outlineId: undefined,
		});
		expect(improvements[1]).toEqual({
			scenarioId: scenarioB.id,
			outlineId: undefined,
		});
	});

	test("flags regular scenario that matches existing scenario outline", () => {
		const outline: Scenario = {
			id: uuidv4(),
			keyword: "Scenario Outline",
			name: "Errors by action",
			steps: [
				{
					id: uuidv4(),
					keyword: "Given",
					type: "Given",
					text: "I start the app",
				},
				{
					id: uuidv4(),
					keyword: "When",
					type: "When",
					text: 'I do "<action>"',
				},
				{
					id: uuidv4(),
					keyword: "Then",
					type: "Then",
					text: 'I see an error message "<message>"',
				},
			],
			examples: [
				{
					keyword: "Examples",
					table: {
						header: ["action", "message"],
						rows: [["X", "M"]],
					},
				},
			],
		};

		const scenario = buildScenario("B", "Y", "W");
		const improvements = analyzeScenarioOutlineImprovements([
			outline,
			scenario,
		]);

		expect(improvements).toHaveLength(1);
		expect(improvements[0]).toEqual({
			scenarioId: scenario.id,
			outlineId: outline.id,
		});
	});

	test("prefers joining existing outline over grouping when both apply", () => {
		const outline: Scenario = {
			id: uuidv4(),
			keyword: "Scenario Outline",
			name: "Errors by action",
			steps: [
				{
					id: uuidv4(),
					keyword: "Given",
					type: "Given",
					text: "I start the app",
				},
				{
					id: uuidv4(),
					keyword: "When",
					type: "When",
					text: 'I do "<action>"',
				},
				{
					id: uuidv4(),
					keyword: "Then",
					type: "Then",
					text: 'I see an error message "<message>"',
				},
			],
			examples: [
				{
					keyword: "Examples",
					table: { header: ["action", "message"], rows: [["X", "M"]] },
				},
			],
		};

		const scenarioA = buildScenario("A", "Y", "W");
		const scenarioB = buildScenario("B", "Z", "Q");

		// Both A and B match the outline signature AND could group together
		const improvements = analyzeScenarioOutlineImprovements([
			outline,
			scenarioA,
			scenarioB,
		]);

		// Each should join the outline, not create a new one
		expect(improvements).toHaveLength(2);
		for (const imp of improvements) {
			expect(imp.outlineId).toBe(outline.id);
		}
	});

	test("returns empty when no improvements detected", () => {
		const scenarioA = buildScenario("A", "X", "M");
		const improvements = analyzeScenarioOutlineImprovements([scenarioA]);
		expect(improvements).toHaveLength(0);
	});
});
