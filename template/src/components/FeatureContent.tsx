import { useState } from "react";
import {
	FileText,
	BookOpen,
	Layers,
	ListChecks,
	AlertCircle,
	TriangleAlert,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { MarkdownContent } from "@/components/MarkdownContent";
import { TagBadge } from "@/components/TagBadge";
import { StepList } from "@/components/StepList";
import { TableCellValue } from "@/components/TableCellValue";
import { resolveExampleVars, type ExampleRowKey } from "@/functions/examples";
import type { Feature, Rule } from "@/schemas/data";
import { buildRuleUrl } from "@/functions/feature";
import type { FeaturePath } from "@/types/navigation";
import { useAtomValue } from "jotai";
import { foldersAtom } from "@/atoms/state";
import { scenarioImprovementsAtom } from "@/atoms/scenarioImprovements";
import { cn } from "@/lib/utils";

type FeatureContentProps = {
	feature: Feature;
	path: FeaturePath;
	rule?: Rule;
};

export const FeatureContent = ({
	feature,
	path,
	rule,
}: FeatureContentProps) => {
	const folders = useAtomValue(foldersAtom);
	const allImprovements = useAtomValue(scenarioImprovementsAtom);

	const subject = rule ?? feature;
	const scenarios = subject.scenarios ?? [];
	const background = subject.background;
	const tags = subject.tags ?? [];

	// Feature with rules and no rule selected: show rules list
	const hasRules = !rule && (feature.rules?.length ?? 0) > 0;

	/**
	 * Map of scenarioIndex → selected ExampleRowKey.
	 * Tracks which example row is selected for each Scenario Outline.
	 */
	const [selectedExampleRows, setSelectedExampleRows] = useState<
		Record<number, ExampleRowKey | null>
	>({});

	const toggleExampleRow = (
		scenarioIndex: number,
		examplesIndex: number,
		rowIndex: number,
	) => {
		const key: ExampleRowKey = `${examplesIndex}-${rowIndex}`;
		setSelectedExampleRows((prev) => {
			const current = prev[scenarioIndex];
			return {
				...prev,
				[scenarioIndex]: current === key ? null : key,
			};
		});
	};

	const getRuleUrl = (ruleIndex: number): string => {
		const rule = feature.rules?.[ruleIndex];
		return rule ? buildRuleUrl(folders, path, rule) : "/";
	};

	return (
		<div className="flex flex-col gap-6 max-w-5xl mx-auto px-6 py-8">
			{/* Feature/Rule header */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					{rule ? (
						<ListChecks className="size-5 text-primary shrink-0" />
					) : (
						<FileText className="size-5 text-primary shrink-0" />
					)}
					<span className="text-[10px] font-mono font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
						{subject.keyword}
					</span>
				</div>
				<h2 className="text-2xl font-bold tracking-tight">{subject.name}</h2>

				{subject.description && (
					<div className="text-sm text-muted-foreground">
						<MarkdownContent content={subject.description.trim()} />
					</div>
				)}

				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mt-1">
						{tags.map((tag) => (
							<TagBadge key={tag.name} tag={tag} />
						))}
					</div>
				)}
			</div>

			<Separator />

			{/* Background */}
			{background && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<BookOpen className="size-4 text-muted-foreground" />
						Background
					</div>
					<div className="rounded-lg border bg-muted/40 px-4 py-3">
						<StepList steps={background.steps} />
					</div>
				</div>
			)}

			{/* Rules list (feature with rules, no rule selected) */}
			{hasRules && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<ListChecks className="size-4 text-muted-foreground" />
						Rules
					</div>
					<div className="flex flex-col gap-2">
						{feature.rules?.map((r, ruleIdx) => {
							const ruleScenarioCount = r.scenarios?.length ?? 0;
							const ruleUrl = getRuleUrl(ruleIdx);
							return (
								<Link
									key={r.name || r.keyword}
									to={ruleUrl ?? "/"}
									className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
								>
									<ListChecks className="size-4 text-muted-foreground shrink-0" />
									<span className="text-sm font-medium flex-1">
										{r.name || r.keyword}
									</span>
									{ruleScenarioCount > 0 && (
										<Badge variant="secondary" className="text-xs shrink-0">
											{ruleScenarioCount} scenario
											{ruleScenarioCount !== 1 ? "s" : ""}
										</Badge>
									)}
								</Link>
							);
						})}
					</div>
				</div>
			)}

			{/* Scenarios (shown when rule selected, or when feature has root-level scenarios) */}
			{(!hasRules || scenarios.length > 0) && (
				<>
					{/* Scenarios count */}
					<div className="flex items-center gap-2 text-muted-foreground">
						<Layers className="size-3.5" />
						<span className="text-xs font-medium uppercase tracking-wider">
							{scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}
						</span>
					</div>

					{scenarios.length === 0 && (
						<div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
							<AlertCircle className="size-8 opacity-40" />
							<p className="text-sm">No scenarios defined in this section.</p>
						</div>
					)}

					{scenarios.length > 0 && (
						<div className="flex flex-col gap-4">
							{scenarios.map((scenario, scenarioIndex) => {
								const isOutline = scenario.keyword === "Scenario Outline";
								const selectedKey = selectedExampleRows[scenarioIndex] ?? null;
								const improvement = !isOutline
									? allImprovements.find((i) => i.scenarioId === scenario.id)
									: undefined;
								const canJoinOutline = improvement?.outlineId !== undefined;
								const canCreateOutline =
									improvement !== undefined &&
									improvement.outlineId === undefined;
								const exampleVars =
									isOutline && scenario.examples
										? resolveExampleVars(scenario.examples, selectedKey)
										: null;

								return (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: required
										key={scenarioIndex}
										className="rounded-lg border bg-card p-4 flex flex-col gap-3"
									>
										{/* Scenario header */}
										<div className="flex items-start gap-2">
											<span
												className={cn(
													"text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0 rounded px-1.5 py-0.5 mt-0.5",
													isOutline
														? "bg-muted text-muted-foreground"
														: "bg-primary/10 text-primary",
												)}
											>
												{scenario.keyword}
											</span>
											<span className="text-sm font-semibold leading-snug flex-1">
												{scenario.name}
											</span>
											{(scenario.tags ?? []).length > 0 && (
												<div className="flex flex-wrap gap-1 ml-auto">
													{scenario.tags?.map((tag) => (
														<TagBadge key={tag.name} tag={tag} small />
													))}
												</div>
											)}
										</div>

										{/* Scenario description */}
										{improvement ? (
											<div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs dark:border-amber-900/70 dark:bg-amber-950/20">
												<div className="flex items-start gap-2">
													<TriangleAlert className="mt-0.5 size-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
													<div className="space-y-1 min-w-0">
														<p className="font-semibold text-amber-900 dark:text-amber-200">
															Scenario outline improvement
														</p>
														{canJoinOutline ? (
															<p className="text-amber-800/90 dark:text-amber-300/90">
																Can be merged into an existing Scenario Outline
																in this section.
															</p>
														) : null}
														{canCreateOutline ? (
															<p className="text-amber-800/90 dark:text-amber-300/90">
																Can be grouped with similar scenarios into a
																Scenario Outline.
															</p>
														) : null}
													</div>
												</div>
											</div>
										) : null}

										{/* Scenario description */}
										{scenario.description ? (
											<div className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
												<MarkdownContent
													content={scenario.description.trim()}
												/>
											</div>
										) : null}

										{/* Scenario steps */}
										{(scenario.steps?.length ?? 0) > 0 && (
											<div className="rounded-md bg-muted/40 px-4 py-3">
												<StepList steps={scenario.steps} vars={exampleVars} />
											</div>
										)}

										{/* Examples (Scenario Outline) */}
										{(scenario.examples?.length ?? 0) > 0 && (
											<div className="flex flex-col gap-2 mt-1">
												{scenario.examples?.map((ex, examplesIndex) => {
													// Build a running row offset so "#" ids are
													// sequential across multiple Examples blocks.
													const priorRowCount =
														scenario.examples
															?.slice(0, examplesIndex)
															.reduce(
																(acc, e) => acc + e.table.rows.length,
																0,
															) ?? 0;

													return (
														<div
															// biome-ignore lint/suspicious/noArrayIndexKey: required
															key={examplesIndex}
															className="flex flex-col gap-1"
														>
															<span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
																{ex.keyword}
																{ex.name ? `: ${ex.name}` : ""}
															</span>
															{(ex.tags ?? []).length > 0 && (
																<div className="flex flex-wrap gap-1">
																	{ex.tags?.map((tag) => (
																		<TagBadge key={tag.name} tag={tag} small />
																	))}
																</div>
															)}
															<div className="overflow-x-auto rounded-md border text-xs">
																<Table>
																	<TableHeader>
																		<TableRow>
																			{/* # column */}
																			<TableHead className="h-7 w-8 px-3 font-mono text-[11px] font-bold text-center">
																				#
																			</TableHead>
																			{/* Preview toggle column */}
																			<TableHead className="h-7 px-3 font-mono text-[11px] font-bold">
																				Preview
																			</TableHead>
																			{/* Data columns */}
																			{ex.table.header.map((col, ci) => (
																				<TableHead
																					// biome-ignore lint/suspicious/noArrayIndexKey: required
																					key={ci}
																					className="h-7 px-3 font-mono text-[11px] font-bold"
																				>
																					{col}
																				</TableHead>
																			))}
																		</TableRow>
																	</TableHeader>
																	<TableBody>
																		{ex.table.rows.map((row, rowIndex) => {
																			const key: ExampleRowKey = `${examplesIndex}-${rowIndex}`;
																			const isSelected = selectedKey === key;
																			return (
																				<TableRow
																					// biome-ignore lint/suspicious/noArrayIndexKey: required
																					key={rowIndex}
																					data-selected={isSelected}
																					className="data-[selected=true]:bg-violet-50 dark:data-[selected=true]:bg-violet-950/30"
																				>
																					{/* # id */}
																					<TableCell className="py-1.5 px-3 font-mono text-[11px] text-center text-muted-foreground">
																						{priorRowCount + rowIndex + 1}
																					</TableCell>
																					{/* Preview toggle */}
																					<TableCell className="py-1 px-3">
																						<div className="overflow-hidden py-0.5 px-3">
																							<Switch
																								checked={isSelected}
																								onCheckedChange={() =>
																									toggleExampleRow(
																										scenarioIndex,
																										examplesIndex,
																										rowIndex,
																									)
																								}
																								aria-label="Preview this example row"
																							/>
																						</div>
																					</TableCell>
																					{/* Data cells */}
																					{row.map((cell, cellIndex) => (
																						<TableCell
																							// biome-ignore lint/suspicious/noArrayIndexKey: required
																							key={cellIndex}
																							className="py-1.5 px-3 font-mono text-[11px]"
																						>
																							<TableCellValue value={cell} />
																						</TableCell>
																					))}
																				</TableRow>
																			);
																		})}
																	</TableBody>
																</Table>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</>
			)}
		</div>
	);
};
