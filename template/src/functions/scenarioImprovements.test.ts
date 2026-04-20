import { describe, expect, test } from "vitest";
import {
	analyzeScenarioOutlineImprovements,
	collectScenarioOutlineImprovementSummary,
} from "./scenarioImprovements";
import type { Feature, Step, Scenario, Rule, FolderNode } from "@/schemas/data";
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
	test("flags regular scenarios that can be grouped into outline", () => {
		const scenarios: Scenario[] = [
			buildScenario("A", "X", "M"),
			buildScenario("B", "Y", "W"),
		];

		const improvements = analyzeScenarioOutlineImprovements(scenarios);

		expect(improvements[0].groupableScenarioIndices).toEqual([1]);
		expect(improvements[1].groupableScenarioIndices).toEqual([0]);
		expect(improvements[0].matchingOutlineIndices).toEqual([]);
		expect(improvements[0].stepGroups.length).toBe(3);
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

		expect(improvements[1].matchingOutlineIndices).toEqual([0]);
		expect(improvements[1].groupableScenarioIndices).toEqual([]);
	});
});

describe("collectScenarioOutlineImprovementSummary", () => {
	test("aggregates improvement totals across folders", () => {
		const feature: Feature = {
			id: uuidv4(),
			keyword: "Feature",
			name: "Errors",
			scenarios: [buildScenario("A", "X", "M"), buildScenario("B", "Y", "W")],
			rules: [
				{
					id: uuidv4(),
					keyword: "Rule",
					name: "Validation",
					scenarios: [
						{
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
						},
						buildScenario("C", "Z", "Q"),
					],
				} satisfies Rule,
			],
		};

		const folders: FolderNode[] = [
			{
				name: "features",
				features: [
					feature as unknown as NonNullable<FolderNode["features"]>[number],
				],
			},
		];

		const summary = collectScenarioOutlineImprovementSummary(folders);

		expect(summary).toEqual({
			scenariosMatchingOutline: 1,
			scenariosGroupableIntoOutline: 2,
			outlineGroupCandidates: 1,
		});
	});
});
