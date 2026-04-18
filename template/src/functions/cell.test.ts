import { describe, expect, test } from "vitest";
import { type CellType, classifyCell } from "./cell";

describe("classifyCell", () => {
	test("empty string returns string", () => {
		expect(classifyCell("")).toBe("string");
	});

	test("whitespace-only returns string", () => {
		expect(classifyCell("   ")).toBe("string");
	});

	test.each<[string, CellType]>([
		["true", "boolean"],
		["false", "boolean"],
		["TRUE", "boolean"],
		["FALSE", "boolean"],
		["True", "boolean"],
		["False", "boolean"],
	])("boolean: %s", (input, expected) => {
		expect(classifyCell(input)).toBe(expected);
	});

	test.each<[string, CellType]>([
		["0", "number"],
		["42", "number"],
		["-7", "number"],
		["+3", "number"],
		["3.14", "number"],
		["-0.5", "number"],
		["100", "number"],
	])("number: %s", (input, expected) => {
		expect(classifyCell(input)).toBe(expected);
	});

	test.each<[string, CellType]>([
		["2024-01-31", "date"],
		["2024-01-31T12:00:00Z", "date"],
		["31/01/2024", "date"],
		["01/31/2024", "date"],
		["31-01-2024", "date"],
		["1 January 2024", "date"],
		["January 1, 2024", "date"],
		["Jan 2024", "date"],
	])("date: %s", (input, expected) => {
		expect(classifyCell(input)).toBe(expected);
	});

	test.each<[string, CellType]>([
		["hello", "string"],
		["foo bar", "string"],
		["not-a-date", "string"],
		["1.2.3", "string"],
		["42abc", "string"],
		["yes", "string"],
		["no", "string"],
	])("string fallback: %s", (input, expected) => {
		expect(classifyCell(input)).toBe(expected);
	});

	test("trims whitespace before classifying", () => {
		expect(classifyCell("  true  ")).toBe("boolean");
		expect(classifyCell("  42  ")).toBe("number");
		expect(classifyCell("  2024-01-31  ")).toBe("date");
		expect(classifyCell("  hello  ")).toBe("string");
	});
});
