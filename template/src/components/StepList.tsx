import type { Step } from "@/types/data";
import { MarkdownContent } from "@/components/MarkdownContent";
import { StepTable } from "@/components/StepTable";
import { StepTextWithVars } from "@/components/StepTextWithVars";

/** Renders a list of steps with optional step tables and variable substitution. */
export const StepList = ({
	steps,
	vars,
}: {
	steps: Step[];
	vars?: Record<string, string> | null;
}) => (
	<div className="flex flex-col gap-1.5">
		{steps.map((step, index) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: required
			<div key={index}>
				<div className="flex items-baseline gap-2 text-sm">
					<span className="font-mono font-semibold text-primary min-w-[3.5rem] text-right shrink-0">
						{step.keyword.trim()}
					</span>
					<StepTextWithVars text={step.text} vars={vars ?? null} />
				</div>
				{step.table && <StepTable step={step} />}
				{step.doc_string && (
					<div className="mt-2 ml-[calc(3.5rem+0.5rem)] rounded-md border border-border bg-muted/30 px-4 py-3 text-muted-foreground">
						<MarkdownContent content={step.doc_string} />
					</div>
				)}
			</div>
		))}
	</div>
);
