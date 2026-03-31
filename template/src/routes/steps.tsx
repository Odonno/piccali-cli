import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useDataContext } from "@/hooks/useDataContext";
import { collectUniqueSteps } from "@/functions/stats";
import { Badge } from "@/components/ui/badge";

const STEP_TYPE_VARIANT = {
	Given: "secondary",
	When: "outline",
	Then: "default",
} as const;

const StepsPage = () => {
	const { data } = useDataContext();
	const folders = data?.folders ?? [];
	const steps = collectUniqueSteps(folders);

	return (
		<div className="max-w-5xl mx-auto px-6 py-8">
			<div className="flex items-center gap-3 mb-6">
				<div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
					<BookOpen className="size-5 text-muted-foreground" />
				</div>
				<div>
					<h1 className="text-xl font-semibold">Step Definitions</h1>
					<p className="text-sm text-muted-foreground">
						{steps.length} unique step{steps.length !== 1 ? "s" : ""} across all
						features
					</p>
				</div>
			</div>

			{steps.length === 0 ? (
				<p className="text-muted-foreground text-sm">No steps found.</p>
			) : (
				<ul className="flex flex-col gap-2">
					{steps.map((step) => (
						<li
							key={step.text}
							className="flex items-baseline gap-3 rounded-md border px-4 py-2.5 text-sm bg-card"
						>
							<Badge
								variant={STEP_TYPE_VARIANT[step.type]}
								className="shrink-0 font-mono text-xs"
							>
								{step.keyword.trim()}
							</Badge>
							<span className="font-mono text-sm text-foreground">
								{step.text}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export const Route = createFileRoute("/steps")({
	component: StepsPage,
});
