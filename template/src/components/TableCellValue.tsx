import { classifyCell, type CellType } from "@/functions/cell";

const CELL_STYLES: Record<CellType, string> = {
	boolean: "text-[var(--type-boolean)]",
	number: "text-[var(--type-number)]",
	date: "text-[var(--type-date)]",
	string: "text-[var(--type-string)]",
};

/**
 * Renders a single table cell value with colour coding based on its type.
 *
 * Colors are driven by CSS custom properties set by the active theme:
 * - boolean → --type-boolean
 * - number  → --type-number
 * - date    → --type-date
 * - string  → --type-string
 */
export const TableCellValue = ({ value }: { value: string }) => {
	const type = classifyCell(value);
	if (value.trim() === "") {
		return <span className="text-muted-foreground/50 italic">—</span>;
	}
	return <span className={CELL_STYLES[type]}>{value}</span>;
};
