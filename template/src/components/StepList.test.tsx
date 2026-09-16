import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StepList } from "./StepList";
import type { Step, StepType } from "@/schemas/data";
import { v4 as uuidv4 } from "uuid";

const makeStep = (
	keyword: string,
	type: StepType,
	text: string,
	table?: { header: string[]; rows: string[][] },
): Step => ({
	id: uuidv4(),
	keyword,
	type,
	text,
	...(table ? { table } : {}),
});

const PRIMARY = 'style="color:var(--primary)"';
const MUTED = 'style="color:var(--muted-foreground)"';

const count = (markup: string, snippet: string) =>
	markup.split(snippet).length - 1;

describe("StepList keyword coloring", () => {
	test("English primary keywords are highlighted", () => {
		const markup = renderToStaticMarkup(
			<StepList
				steps={[
					makeStep("Given ", "Given", "a contract"),
					makeStep("When ", "When", "I search"),
					makeStep("Then ", "Then", "results show"),
				]}
			/>,
		);
		expect(count(markup, PRIMARY)).toBe(3);
		expect(markup).not.toContain("var(--muted-foreground)");
	});

	test("French primary keywords are highlighted via step type", () => {
		const markup = renderToStaticMarkup(
			<StepList
				steps={[
					makeStep("Étant donné ", "Given", "un contrat"),
					makeStep("Quand ", "When", "je recherche"),
					makeStep("Alors ", "Then", "les résultats s'affichent"),
				]}
			/>,
		);
		expect(count(markup, PRIMARY)).toBe(3);
		expect(markup).not.toContain("var(--muted-foreground)");
	});

	test("French conjunction keywords (Et, Mais) are muted", () => {
		const markup = renderToStaticMarkup(
			<StepList
				steps={[
					makeStep("Étant donné ", "Given", "un contrat"),
					makeStep("Et ", "Given", "un véhicule"),
					makeStep("Quand ", "When", "je recherche"),
					makeStep("Mais ", "Then", "aucun résultat"),
				]}
			/>,
		);
		expect(count(markup, PRIMARY)).toBe(2);
		expect(count(markup, MUTED)).toBe(2);
	});

	test("keywords are displayed trimmed", () => {
		const markup = renderToStaticMarkup(
			<StepList steps={[makeStep("Étant donné ", "Given", "un contrat")]} />,
		);
		expect(markup).toContain(">Étant donné</span>");
	});
});

describe("StepList example variable substitution", () => {
	const outlinedStep = makeStep(
		"Then ",
		"Then",
		"the following results are displayed",
		{ header: ["VIN"], rows: [["<input>"]] },
	);

	test("vars substitute placeholders in table cells", () => {
		const markup = renderToStaticMarkup(
			<StepList steps={[outlinedStep]} vars={{ input: "1HGCM82633A004352" }} />,
		);
		expect(markup).toContain("1HGCM82633A004352");
		expect(markup).not.toContain("&lt;input&gt;");
	});

	test("without vars, raw placeholders remain in cells", () => {
		const markup = renderToStaticMarkup(
			<StepList steps={[outlinedStep]} vars={null} />,
		);
		expect(markup).toContain("&lt;input&gt;");
	});
});
