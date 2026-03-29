import { classifyCell, type CellType } from "@/functions/cell";

const CELL_STYLES: Record<CellType, string> = {
	boolean: "text-blue-600 dark:text-blue-400",
	number: "text-emerald-600 dark:text-emerald-400",
	date: "text-amber-600 dark:text-amber-400",
	string: "text-rose-600 dark:text-rose-400",
};

/**
 * Renders a single table cell value with colour coding based on its type.
 *
 * - boolean → blue
 * - number  → green
 * - date    → yellow/amber
 * - string  → red (non-trivial values stand out; empty stays neutral)
 */
export const TableCellValue = ({ value }: { value: string }) => {
	const type = classifyCell(value);
	if (value.trim() === "") {
		return <span className="text-muted-foreground/50 italic">—</span>;
	}
	return <span className={CELL_STYLES[type]}>{value}</span>;
};
