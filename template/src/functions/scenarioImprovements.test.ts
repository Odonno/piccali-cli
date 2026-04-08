import { describe, expect, test } from "vitest";
import {
	analyzeScenarioOutlineImprovements,
	collectScenarioOutlineImprovementSummary,
} from "./scenarioImprovements";
import type { FolderNode, Scenario, Step } from "@/types/data";

const buildSteps = (action: string, message: string): Step[] => [
	{ keyword: "Given", type: "Given", text: "I start the app" },
	{ keyword: "When", type: "When", text: `I do "${action}"` },
	{
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
			keyword: "Scenario Outline",
			name: "Errors by action",
			steps: [
				{ keyword: "Given", type: "Given", text: "I start the app" },
				{ keyword: "When", type: "When", text: 'I do "<action>"' },
				{
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
		const folders: FolderNode[] = [
			{
				name: "features",
				features: [
					{
						keyword: "Feature",
						name: "Errors",
						scenarios: [
							buildScenario("A", "X", "M"),
							buildScenario("B", "Y", "W"),
						],
						rules: [
							{
								keyword: "Rule",
								name: "Validation",
								scenarios: [
									{
										keyword: "Scenario Outline",
										name: "Errors by action",
										steps: [
											{
												keyword: "Given",
												type: "Given",
												text: "I start the app",
											},
											{
												keyword: "When",
												type: "When",
												text: 'I do "<action>"',
											},
											{
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
							},
						],
					},
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
