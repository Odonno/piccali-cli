import { dialects } from "@cucumber/gherkin";

/**
 * Gherkin conjunction keywords (and / but) across all dialects, trimmed.
 * Steps using these inherit the preceding step's type, so they must not be highlighted as primary keywords.
 *
 * Source of truth: @cucumber/gherkin `dialects` (official Gherkin languages table).
 *
 * ponytail: a few keywords ("*", "Ja", "Dan", "Ak", "अनी") are conjunctions in one dialect and primaries in another; they resolve to conjunction here.
 * Correct those per-language only if those dialects ever matter.
 */
const conjunctionKeywords = new Set<string>();
for (const dialect of Object.values(dialects)) {
	for (const keyword of [...dialect.and, ...dialect.but]) {
		conjunctionKeywords.add(keyword.trim());
	}
}

export const CONJUNCTION_KEYWORDS = conjunctionKeywords;
