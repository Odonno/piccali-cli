import type { Examples } from "@/schemas/data";

/**
 * Key for a selected example row: "examplesIndex-rowIndex".
 * Used to track which row is selected within a single Scenario Outline.
 */
export type ExampleRowKey = `${number}-${number}`;

/**
 * Resolves the variable→value mapping from an Examples table row.
 * Returns null if exampleRowKey is null.
 */
export const resolveExampleVars = (
	examples: Examples[],
	exampleRowKey: ExampleRowKey | null,
): Record<string, string> | null => {
	if (!exampleRowKey) return null;
	const [eiStr, riStr] = exampleRowKey.split("-");
	const ei = Number(eiStr);
	const ri = Number(riStr);
	const ex = examples[ei];
	if (!ex) return null;
	const vars: Record<string, string> = {};
	ex.table.header.forEach((col, ci) => {
		vars[col] = ex.table.rows[ri]?.[ci] ?? "";
	});
	return vars;
};
