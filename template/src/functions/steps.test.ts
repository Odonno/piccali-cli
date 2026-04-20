import { describe, expect, test } from "vitest";
import {
	collectUniqueSteps,
	groupStepsByPattern,
	normalizePlaceholders,
	toPattern,
	toSlug,
} from "./steps";
import type { FolderNode, Step, StepType } from "@/schemas/data";
import { v4 as uuidv4 } from "uuid";

const makeStep = (type: StepType, text: string, keyword = type): Step => ({
	id: uuidv4(),
	keyword,
	type,
	text,
});

const makeFolder = (steps: Step[]): FolderNode => ({
	name: "root",
	features: [
		{
			id: "feat-1",
			keyword: "Feature",
			name: "Test Feature",
			scenarios: [
				{
					id: "sc-1",
					keyword: "Scenario",
					name: "Test Scenario",
					steps,
				},
			],
		},
	],
});

describe("toPattern", () => {
	test("leaves plain text unchanged", () => {
		expect(toPattern("I am on the home page")).toBe("I am on the home page");
	});

	test("replaces quoted string with (.+)", () => {
		expect(toPattern('I search by VIN "1HGCM82633A004352"')).toBe(
			'I search by VIN "(.+)"',
		);
	});

	test("replaces multiple quoted strings", () => {
		expect(toPattern('I set "username" to "admin"')).toBe(
			'I set "(.+)" to "(.+)"',
		);
	});

	test("replaces standalone integer", () => {
		expect(toPattern("I wait 5 seconds")).toBe("I wait (\\d+) seconds");
	});

	test("replaces ISO date", () => {
		expect(toPattern("the date is 2024-01-15")).toBe(
			"the date is (\\d{4}-\\d{2}-\\d{2})",
		);
	});

	test("replaces European date", () => {
		expect(toPattern("the date is 15/01/2024")).toBe(
			"the date is (\\d{2}/\\d{2}/\\d{4})",
		);
	});
});

describe("normalizePlaceholders", () => {
	test("no placeholders → unchanged", () => {
		expect(normalizePlaceholders("I am on the home page")).toBe(
			"I am on the home page",
		);
	});

	test("single (.+) → $1", () => {
		expect(normalizePlaceholders('I search by VIN "(.+)"')).toBe(
			'I search by VIN "$1"',
		);
	});

	test("multiple placeholders numbered sequentially", () => {
		expect(normalizePlaceholders('I set "(.+)" to "(.+)"')).toBe(
			'I set "$1" to "$2"',
		);
	});
});

describe("toSlug", () => {
	test("plain step produces readable slug", () => {
		expect(toSlug("Given", "I am logged in")).toBe("given-i-am-logged-in");
	});

	test("step with quoted placeholder uses $1 in slug", () => {
		expect(toSlug("When", 'I search by VIN "(.+)"')).toBe(
			"when-i-search-by-vin-$1",
		);
	});

	test("two different placeholders use $1 and $2", () => {
		expect(toSlug("Given", 'I set "(.+)" to "(.+)"')).toBe(
			"given-i-set-$1-to-$2",
		);
	});
});

describe("collectUniqueSteps", () => {
	test("empty folders returns empty array", () => {
		expect(collectUniqueSteps([])).toEqual([]);
	});

	test("identical step texts are deduplicated", () => {
		const step = makeStep("Given", "I am logged in");
		const result = collectUniqueSteps([makeFolder([step, step])]);
		expect(result).toHaveLength(1);
	});

	test("VIN plain and VIN quoted produce two distinct groups", () => {
		const plain = makeStep("When", "I search by VIN");
		const quoted = makeStep("When", 'I search by VIN "1HGCM82633A004352"');
		const result = collectUniqueSteps([makeFolder([plain, quoted])]);

		expect(result).toHaveLength(2);

		const ids = result.map((g) => g.id);
		expect(ids).toContain("when-i-search-by-vin");
		expect(ids).toContain("when-i-search-by-vin-$1");
	});

	test("two different quoted VIN values group into one pattern", () => {
		const vin1 = makeStep("When", 'I search by VIN "1HGCM82633A004352"');
		const vin2 = makeStep("When", 'I search by VIN "2T1BURHE0JC043821"');
		const result = collectUniqueSteps([makeFolder([vin1, vin2])]);

		expect(result).toHaveLength(1);
		expect(result[0].matches).toHaveLength(2);
		expect(result[0].id).toBe("when-i-search-by-vin-$1");
	});

	test("Given, When, Then steps each form separate groups", () => {
		const steps = [
			makeStep("Given", "I am logged in"),
			makeStep("Given", "the system is ready"),
			makeStep("Given", "I have 5 items in my cart"),
			makeStep("When", "I click the submit button"),
			makeStep("When", 'I search by VIN "ABC123"'),
			makeStep("When", 'I filter by status "active"'),
			makeStep("Then", "I see the dashboard"),
			makeStep("Then", "the total is 42"),
			makeStep("Then", 'the message is "Success"'),
		];

		const result = collectUniqueSteps([makeFolder(steps)]);
		expect(result).toHaveLength(9);

		const given = result.filter((g) => g.type === "Given");
		const when = result.filter((g) => g.type === "When");
		const then = result.filter((g) => g.type === "Then");

		expect(given).toHaveLength(3);
		expect(when).toHaveLength(3);
		expect(then).toHaveLength(3);
	});

	test("numeric variants group together", () => {
		const s1 = makeStep("Then", "the total is 10");
		const s2 = makeStep("Then", "the total is 99");
		const result = collectUniqueSteps([makeFolder([s1, s2])]);

		expect(result).toHaveLength(1);
		expect(result[0].matches).toHaveLength(2);
		expect(result[0].pattern).toBe("the total is (\\d+)");
	});

	test("steps with same slug but different raw patterns group together", () => {
		// One step ends with a trailing colon after the quoted value; the other does not.
		// Both produce the same slug once non-alphanumeric chars are stripped, so they must end up in a single group.
		const step1 = makeStep(
			"Given",
			'a branch "RAINBOW MOTORS INC" with a sub-contract "2281804540020" active linked to legal contract "22815092700":',
		);
		const step2 = makeStep(
			"Given",
			'a branch "APEX CONSULTING HUB" with a sub-contract "2281804540001" active linked to legal contract "Contract 1"',
		);
		const result = collectUniqueSteps([makeFolder([step1, step2])]);

		expect(result).toHaveLength(1);
		expect(result[0].matches).toHaveLength(2);
	});

	test("steps from nested folders are collected", () => {
		const root: FolderNode = {
			name: "root",
			folders: [
				{
					name: "sub",
					features: [
						{
							id: "feat-sub",
							keyword: "Feature",
							name: "Sub Feature",
							scenarios: [
								{
									id: "sc-sub",
									keyword: "Scenario",
									name: "Sub Scenario",
									steps: [makeStep("Given", "I am on the sub page")],
								},
							],
						},
					],
				},
			],
		};
		const result = collectUniqueSteps([root]);
		expect(result).toHaveLength(1);
		expect(result[0].matches[0].text).toBe("I am on the sub page");
	});
});

describe("groupStepsByPattern", () => {
	test("steps with same pattern share a group", () => {
		const steps: Step[] = [
			makeStep("Given", 'I set "username" to "alice"'),
			makeStep("Given", 'I set "username" to "bob"'),
		];
		const groups = groupStepsByPattern(steps);
		expect(groups).toHaveLength(1);
		expect(groups[0].matches).toHaveLength(2);
	});

	test("steps with different types stay in separate groups even with same text", () => {
		const steps: Step[] = [
			makeStep("Given", "the system is ready"),
			makeStep("When", "the system is ready"),
			makeStep("Then", "the system is ready"),
		];
		const groups = groupStepsByPattern(steps);
		expect(groups).toHaveLength(3);
	});
});
