import { Fragment } from "react";
import type { Step } from "@/schemas/data";
import { MarkdownContent } from "@/components/MarkdownContent";
import { StepTable } from "@/components/StepTable";
import { StepTextWithVars } from "@/components/StepTextWithVars";
import { PRIMARY_STEP_TYPES } from "@/constants/steps";
import { CONJUNCTION_KEYWORDS } from "@/constants/conjunctionKeywords";

/** Renders a list of steps with optional step tables and variable substitution.
 *
 * A single grid sizes the keyword column to the widest keyword across all
 * steps (e.g. French "Étant donné"), keeping step text aligned.
 */
export const StepList = ({
	steps,
	vars,
}: {
	steps: Step[];
	vars?: Record<string, string> | null;
}) => (
	<div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-2 gap-y-1.5 text-sm">
		{steps.map((step, index) => {
			const trimmed = step.keyword.trim();
			// Conjunction keywords (And/But/Et/Mais/…) inherit the previous
			// step's type, so they must be excluded from primary highlighting.
			const isPrimary =
				PRIMARY_STEP_TYPES.includes(step.type) &&
				!CONJUNCTION_KEYWORDS.has(trimmed);

			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: required
				<Fragment key={index}>
					<span
						className="font-mono font-semibold min-w-14 text-right"
						style={{
							color: isPrimary ? "var(--primary)" : "var(--muted-foreground)",
						}}
					>
						{trimmed}
					</span>
					<StepTextWithVars text={step.text} vars={vars ?? null} />
					{step.table && <StepTable step={step} />}
					{step.doc_string && (
						<div className="col-start-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-muted-foreground">
							<MarkdownContent content={step.doc_string} />
						</div>
					)}
				</Fragment>
			);
		})}
	</div>
);
