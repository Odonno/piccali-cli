import { describe, expect, test } from "vitest";
import { isScenarioOutline } from "./scenario";
import type { Scenario } from "@/schemas/data";
import { v4 as uuidv4 } from "uuid";

const makeScenario = (
	keyword: string,
	examples?: Scenario["examples"],
): Scenario => ({
	id: uuidv4(),
	keyword,
	name: "Some scenario",
	steps: [],
	...(examples ? { examples } : {}),
});

const examples = [
	{
		keyword: "Examples",
		table: { header: ["a"], rows: [["1"]] },
	},
];

describe("isScenarioOutline", () => {
	test("true for English Scenario Outline with examples", () => {
		expect(isScenarioOutline(makeScenario("Scenario Outline", examples))).toBe(
			true,
		);
	});

	test("true for French Plan du scénario with examples", () => {
		expect(isScenarioOutline(makeScenario("Plan du scénario", examples))).toBe(
			true,
		);
	});

	test("false for plain Scenario without examples", () => {
		expect(isScenarioOutline(makeScenario("Scenario"))).toBe(false);
	});

	test("false for French Scénario without examples", () => {
		expect(isScenarioOutline(makeScenario("Scénario"))).toBe(false);
	});

	test("false for empty examples array", () => {
		expect(isScenarioOutline(makeScenario("Plan du scénario", []))).toBe(false);
	});
});
