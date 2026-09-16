import type { Step } from "@/schemas/data";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TableCellValue } from "@/components/TableCellValue";
import { StepTextWithVars } from "@/components/StepTextWithVars";

/** Renders a step table (data table attached to a step). */
export const StepTable = ({
	step,
	vars,
}: {
	step: Step;
	vars?: Record<string, string> | null;
}) => {
	if (!step.table) return null;
	const { header, rows } = step.table;

	return (
		<div className="col-start-2 overflow-x-auto rounded-md border text-xs">
			<Table>
				<TableHeader>
					<TableRow>
						{header.map((col, index) => (
							<TableHead
								// biome-ignore lint/suspicious/noArrayIndexKey: required
								key={index}
								className="h-7 px-3 font-mono text-[11px] font-bold"
							>
								{col}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row, rowIndex) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: required
						<TableRow key={rowIndex}>
							{row.map((cell, cellIndex) => (
								<TableCell
									// biome-ignore lint/suspicious/noArrayIndexKey: required
									key={cellIndex}
									className="py-1.5 px-3 font-mono text-[11px]"
								>
									{vars && cell.startsWith("<") && cell.endsWith(">") ? (
										<StepTextWithVars text={cell} vars={vars} />
									) : (
										<TableCellValue value={cell} />
									)}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};
