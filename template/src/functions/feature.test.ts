import { describe, expect, test } from "vitest";
import type { Feature, FolderNode } from "@/schemas/data";
import {
	buildFeatureUrl,
	buildRuleUrl,
	resolveFeatureBySlug,
	resolveRuleBySlug,
} from "./feature";

const feature = (name: string, id: string): Feature => ({
	id,
	keyword: "Feature",
	name,
});

const folder = (name: string, id: string, features: Feature[]): FolderNode => ({
	id,
	name,
	features,
});

describe("url slug disambiguation", () => {
	// Mirrors features/RegexPatterns: two files, identical Feature name
	const folders = [
		folder("RegexPatterns", "f1111111", [
			feature("Input validation with regex patterns", "aaaa1111"),
			feature("Input validation with regex patterns", "bbbb2222"),
			feature("Search by dealer", "cccc3333"),
		]),
	];

	test("duplicate feature names get id-suffixed, distinct URLs", () => {
		const urlA = buildFeatureUrl(folders, { folderPath: [0], featureIndex: 0 });
		const urlB = buildFeatureUrl(folders, { folderPath: [0], featureIndex: 1 });

		expect(urlA).toBe(
			"/features/regexpatterns/input-validation-with-regex-patterns-aaaa1111",
		);
		expect(urlB).toBe(
			"/features/regexpatterns/input-validation-with-regex-patterns-bbbb2222",
		);
	});

	test("unique feature name keeps a clean slug", () => {
		expect(buildFeatureUrl(folders, { folderPath: [0], featureIndex: 2 })).toBe(
			"/features/regexpatterns/search-by-dealer",
		);
	});

	test("both duplicate URLs resolve to their own feature", () => {
		expect(
			resolveFeatureBySlug(folders, [
				"regexpatterns",
				"input-validation-with-regex-patterns-aaaa1111",
			])?.path.featureIndex,
		).toBe(0);

		expect(
			resolveFeatureBySlug(folders, [
				"regexpatterns",
				"input-validation-with-regex-patterns-bbbb2222",
			])?.path.featureIndex,
		).toBe(1);
	});

	test("duplicate rule names within a feature disambiguate", () => {
		const feature: Feature = {
			id: "aaaa1111",
			keyword: "Feature",
			name: "Input validation",
			rules: [
				{ id: "r1aaaaa1", keyword: "Rule", name: "Validation" },
				{ id: "r2bbbb2b", keyword: "Rule", name: "Validation" },
			],
		};
		const tree = [folder("X", "f2222222", [feature])];
		const path = { folderPath: [0], featureIndex: 0 };
		const rules = feature.rules ?? [];

		expect(buildRuleUrl(tree, path, feature, rules[0])).toBe(
			"/features/x/input-validation/rules/validation-r1aaaaa1",
		);
		expect(buildRuleUrl(tree, path, feature, rules[1])).toBe(
			"/features/x/input-validation/rules/validation-r2bbbb2b",
		);
		expect(resolveRuleBySlug(feature, "validation-r2bbbb2b")?.ruleIndex).toBe(
			1,
		);
	});

	test("folder names slugifying identically disambiguate", () => {
		const tree = [
			folder("Input Folder", "fa11aa11", [feature("Login", "l1l1l1l1")]),
			folder("input-folder", "fb22bb22", [feature("Logout", "l2l2l2l2")]),
		];
		expect(buildFeatureUrl(tree, { folderPath: [0], featureIndex: 0 })).toBe(
			"/features/input-folder-fa11aa11/login",
		);
		expect(
			resolveFeatureBySlug(tree, ["input-folder-fb22bb22", "logout"])?.path,
		).toEqual({ folderPath: [1], featureIndex: 0 });
	});

	test("missing ids fall back to bare slugs (older data)", () => {
		// Post-parse `id` is always a string; simulate raw pre-parse data
		const tree = [
			{
				name: "RegexPatterns",
				features: [
					{ keyword: "Feature", name: "Dup" },
					{ keyword: "Feature", name: "Dup" },
				] as Feature[],
			},
		];
		expect(buildFeatureUrl(tree, { folderPath: [0], featureIndex: 1 })).toBe(
			"/features/regexpatterns/dup",
		);
	});
});
