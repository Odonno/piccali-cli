/** Cell value type categories for colour-coding. */
export type CellType = "boolean" | "number" | "date" | "string";

/**
 * Detects the semantic type of a raw table cell string.
 *
 * - boolean  → "true" / "false" (case-insensitive)
 * - number   → anything parseable as a finite number (incl. decimals, negatives)
 * - date     → ISO 8601, DD/MM/YYYY, MM-DD-YYYY, common date-like patterns
 * - string   → everything else
 */
export const classifyCell = (value: string): CellType => {
	const v = value.trim();
	if (v === "") return "string";

	// Boolean
	if (/^(true|false)$/i.test(v)) return "boolean";

	// Number — allow optional leading sign, digits, optional decimal, no trailing alpha
	if (/^[+-]?\d+(\.\d+)?$/.test(v)) return "number";

	// Date patterns:
	//   ISO 8601:          2024-01-31  or  2024-01-31T12:00:00Z
	//   DD/MM/YYYY:        31/01/2024
	//   MM/DD/YYYY:        01/31/2024
	//   DD-MM-YYYY:        31-01-2024
	//   Month name:        Jan 2024 | January 1st 2024
	const datePatterns = [
		/^\d{4}-\d{2}-\d{2}(T[\d::.Z+-]*)?$/, // ISO
		/^\d{2}[/-]\d{2}[/-]\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
		/^\d{1,2}\s+\w+\s+\d{4}$/, // 1 January 2024
		/^\w+\s+\d{1,2},?\s+\d{4}$/, // January 1, 2024
		/^\w{3}\s+\d{4}$/, // Jan 2024
	];
	if (datePatterns.some((re) => re.test(v))) return "date";

	return "string";
};
