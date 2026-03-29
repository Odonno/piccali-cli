import type { Step } from "@/types/data";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TableCellValue } from "@/components/TableCellValue";

/** Renders a step table (data table attached to a step). */
export const StepTable = ({ step }: { step: Step }) => {
	if (!step.table) return null;
	const { header, rows } = step.table;

	return (
		<div className="mt-2 ml-[3.5rem] overflow-x-auto rounded-md border text-xs">
			<Table>
				<TableHeader>
					<TableRow>
						{header.map((col, i) => (
							<TableHead
								key={i}
								className="h-7 px-3 font-mono text-[11px] font-bold"
							>
								{col}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row, ri) => (
						<TableRow key={ri}>
							{row.map((cell, ci) => (
								<TableCell
									key={ci}
									className="py-1.5 px-3 font-mono text-[11px]"
								>
									<TableCellValue value={cell} />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};
