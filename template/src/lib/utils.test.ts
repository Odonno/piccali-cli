import { describe, expect, test } from "vitest";
import { slugify } from "./utils";

describe("slugify", () => {
  test("Sélection d'un numéro VIN", () => {
    const value = slugify("Sélection d'un numéro VIN");
    expect(value).toBe("selection-dun-numero-vin");
  });

  test.each([
    ["Page /other", "page-other"],
    ["Feature /with/slashes", "feature-withslashes"],
    ["Page /other page?", "page-other-page"],
    ["a#b&c+d~e", "abandcde"],
    ["SearchByDealer", "searchbydealer"],
  ])("strict mode, %s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
