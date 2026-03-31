import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ListChecks, BookOpen } from "lucide-react";
import { useDataContext } from "@/hooks/useDataContext";
import {
	countFeatures,
	countScenarios,
	countScenarioOutlines,
	collectUniqueSteps,
} from "@/functions/stats";
import { StatCard } from "@/components/StatCard";

const IndexPage = () => {
	const { data } = useDataContext();
	const folders = data?.folders ?? [];

	const features = countFeatures(folders);
	const scenarios = countScenarios(folders);
	const outlines = countScenarioOutlines(folders);
	const steps = collectUniqueSteps(folders);

	return (
		<div className="max-w-4xl mx-auto px-6 py-10">
			<div className="mb-8">
				<h1 className="text-2xl font-bold tracking-tight">Overview</h1>
				<p className="text-muted-foreground text-sm mt-1">
					A summary of all feature files in this project.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<StatCard
					icon={<FileText className="size-4 text-muted-foreground" />}
					value={features}
					label={features === 1 ? "feature file" : "feature files"}
				/>

				<StatCard
					icon={<ListChecks className="size-4 text-muted-foreground" />}
					value={scenarios}
					label=""
				>
					<p className="text-sm text-muted-foreground">
						{scenarios === 1 ? "scenario" : "scenarios"}
						{outlines > 0 && (
							<>
								{" "}
								<span className="text-foreground/50 text-xs">
									({outlines} outline{outlines !== 1 ? "s" : ""})
								</span>
							</>
						)}
					</p>
				</StatCard>

				<StatCard
					icon={<BookOpen className="size-4 text-muted-foreground" />}
					value={steps.length}
					label=""
				>
					<Link
						to="/steps"
						className="text-sm text-primary underline-offset-4 hover:underline"
					>
						{steps.length === 1 ? "step" : "steps"} — view definitions
					</Link>
				</StatCard>
			</div>
		</div>
	);
};

export const Route = createFileRoute("/")({
	component: IndexPage,
});
