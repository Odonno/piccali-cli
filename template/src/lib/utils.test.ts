import { slugify } from "./utils";
import { describe, expect, test } from "vitest";

describe("slugify", () => {
	test("Sélection d'un numéro VIN", () => {
		const value = slugify("Sélection d'un numéro VIN");
		expect(value).toBe("selection-dun-numero-vin");
	});
});
