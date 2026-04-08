import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ListChecks, BookOpen, TriangleAlert } from "lucide-react";
import { useDataContext } from "@/hooks/useDataContext";
import {
	countFeatures,
	countScenarios,
	countScenarioOutlines,
	collectUniqueSteps,
} from "@/functions/stats";
import { collectScenarioOutlineImprovementSummary } from "@/functions/scenarioImprovements";
import { StatCard } from "@/components/StatCard";

const IndexPage = () => {
	const { data } = useDataContext();
	const folders = data?.folders ?? [];

	const features = countFeatures(folders);
	const scenarios = countScenarios(folders);
	const outlines = countScenarioOutlines(folders);
	const steps = collectUniqueSteps(folders);
	const scenarioOutlineImprovements =
		collectScenarioOutlineImprovementSummary(folders);
	const {
		scenariosMatchingOutline,
		scenariosGroupableIntoOutline,
		outlineGroupCandidates,
	} = scenarioOutlineImprovements;
	const totalWarnings =
		scenariosMatchingOutline + scenariosGroupableIntoOutline;
	const hasWarnings = totalWarnings > 0;

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

			{hasWarnings ? (
				<div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900/70 dark:bg-amber-950/20">
					<div className="flex items-start gap-2">
						<TriangleAlert className="mt-0.5 size-4 text-amber-700 dark:text-amber-400 shrink-0" />
						<div className="min-w-0 space-y-1">
							<p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
								Scenario outline improvements detected
							</p>
							<p className="text-xs text-amber-800/90 dark:text-amber-300/90">
								{scenariosMatchingOutline} scenario
								{scenariosMatchingOutline !== 1 ? "s" : ""} can join an existing
								outline, {scenariosGroupableIntoOutline} scenario
								{scenariosGroupableIntoOutline !== 1 ? "s" : ""} can be grouped
								into new outlines ({outlineGroupCandidates} candidate
								{outlineGroupCandidates !== 1 ? "s" : ""}
								).
							</p>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};

export const Route = createFileRoute("/")({
	component: IndexPage,
});
