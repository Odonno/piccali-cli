import { describe, expect, test } from "vitest";
import * as v from "valibot";
import { MetadataSchema } from "@/schemas/metadata";
import { scenarioOutlineImprovementsEnabled } from "./scenarioImprovements";

describe("scenarioOutlineImprovementsEnabled", () => {
	test("missing metadata (still loading) keeps the feature off", () => {
		expect(scenarioOutlineImprovementsEnabled(null)).toBe(false);
	});

	test("metadata without a features key defaults to off", () => {
		const metadata = v.parse(MetadataSchema, {
			createdAt: "2026-01-01T00:00:00.000Z",
		});

		expect(scenarioOutlineImprovementsEnabled(metadata)).toBe(false);
	});

	test("features.scenarioOutlineImprovements: false keeps it off", () => {
		const metadata = v.parse(MetadataSchema, {
			createdAt: "2026-01-01T00:00:00.000Z",
			features: { scenarioOutlineImprovements: false },
		});

		expect(scenarioOutlineImprovementsEnabled(metadata)).toBe(false);
	});

	test("features.scenarioOutlineImprovements: true enables it", () => {
		const metadata = v.parse(MetadataSchema, {
			createdAt: "2026-01-01T00:00:00.000Z",
			features: { scenarioOutlineImprovements: true },
		});

		expect(scenarioOutlineImprovementsEnabled(metadata)).toBe(true);
	});
});
