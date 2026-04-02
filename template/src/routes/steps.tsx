import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Search } from "lucide-react";
import { useDataContext } from "@/hooks/useDataContext";
import { collectUniqueSteps } from "@/functions/stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { StepType } from "@/types/data";

const ALL_STEP_TYPES: StepType[] = ["Given", "When", "Then"];

/**
 * Distinctive OKLCH colors per variant — scoped to this page only.
 * bg/text are used on the badge; border is used on the row left accent.
 * All values chosen to be perceptually distinct and readable in both
 * light and dark mode.
 */
const STEP_TYPE_COLORS: Record<
	StepType,
	{ bg: string; text: string; border: string; dimBg: string }
> = {
	Given: {
		bg: "oklch(0.65 0.17 155)", // emerald green
		text: "oklch(0.97 0.02 155)",
		border: "oklch(0.65 0.17 155)",
		dimBg: "oklch(0.65 0.17 155 / 8%)",
	},
	When: {
		bg: "oklch(0.72 0.17 55)", // amber
		text: "oklch(0.18 0.04 55)",
		border: "oklch(0.72 0.17 55)",
		dimBg: "oklch(0.72 0.17 55 / 8%)",
	},
	Then: {
		bg: "oklch(0.58 0.22 280)", // violet
		text: "oklch(0.97 0.02 280)",
		border: "oklch(0.58 0.22 280)",
		dimBg: "oklch(0.58 0.22 280 / 8%)",
	},
};

const STEP_TYPE_ORDER: Record<StepType, number> = {
	Given: 0,
	When: 1,
	Then: 2,
};

const StepsPage = () => {
	const { data } = useDataContext();
	const folders = data?.folders ?? [];
	const allSteps = collectUniqueSteps(folders);

	const [activeTypes, setActiveTypes] = useState<Set<StepType>>(
		new Set(ALL_STEP_TYPES),
	);
	const [search, setSearch] = useState("");

	const toggleType = (type: StepType) => {
		setActiveTypes((prev) => {
			const next = new Set(prev);
			if (next.has(type)) {
				next.delete(type);
			} else {
				next.add(type);
			}
			return next;
		});
	};

	const normalizedSearch = search.trim().toLowerCase();

	const filteredSteps = allSteps
		.filter((group) => {
			if (!activeTypes.has(group.type)) return false;
			if (normalizedSearch) {
				// Match against pattern or any of the original step texts
				const inPattern = group.pattern
					.toLowerCase()
					.includes(normalizedSearch);
				const inMatches = group.matches.some((s) =>
					s.text.toLowerCase().includes(normalizedSearch),
				);
				if (!inPattern && !inMatches) return false;
			}
			return true;
		})
		.sort((a, b) => STEP_TYPE_ORDER[a.type] - STEP_TYPE_ORDER[b.type]);

	const isFiltered =
		filteredSteps.length !== allSteps.length ||
		activeTypes.size !== ALL_STEP_TYPES.length ||
		normalizedSearch !== "";

	return (
		<div className="max-w-5xl mx-auto px-6 py-8">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
					<BookOpen className="size-5 text-muted-foreground" />
				</div>
				<div>
					<h1 className="text-xl font-semibold">Step Definitions</h1>
					<p className="text-sm text-muted-foreground">
						{isFiltered
							? `${filteredSteps.length} of ${allSteps.length} step${allSteps.length !== 1 ? "s" : ""} shown`
							: `${allSteps.length} unique step${allSteps.length !== 1 ? "s" : ""} across all features`}
					</p>
				</div>
			</div>

			{/* Controls: toggle filters + search */}
			<div className="flex flex-wrap items-center gap-2 mb-4">
				<div className="flex items-center gap-1">
					{ALL_STEP_TYPES.map((type) => {
						const active = activeTypes.has(type);
						const colors = STEP_TYPE_COLORS[type];
						return (
							<Button
								key={type}
								variant="outline"
								size="sm"
								aria-pressed={active}
								onClick={() => toggleType(type)}
								className={cn(
									"font-mono text-xs h-8 px-3 border transition-opacity",
									!active && "opacity-40",
								)}
								style={
									active
										? {
												backgroundColor: colors.dimBg,
												borderColor: colors.border,
												color: colors.border,
											}
										: undefined
								}
							>
								{type}
							</Button>
						);
					})}
				</div>

				<div className="relative flex-1 min-w-48">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input
						type="search"
						placeholder="Filter steps…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8 pl-8 text-sm font-mono"
					/>
				</div>
			</div>

			{/* Step list */}
			{allSteps.length === 0 ? (
				<p className="text-muted-foreground text-sm">No steps found.</p>
			) : filteredSteps.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No steps match the current filters.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{filteredSteps.map((group) => {
						const colors = STEP_TYPE_COLORS[group.type];
						return (
							<li
								key={group.id}
								className="flex items-baseline gap-3 rounded-md border px-4 py-2.5 text-sm bg-card"
								style={{
									borderLeftColor: colors.border,
									borderLeftWidth: "3px",
								}}
							>
								<span
									className="shrink-0 font-mono text-xs font-semibold rounded-sm px-1.5 py-0.5"
									style={{
										backgroundColor: colors.bg,
										color: colors.text,
									}}
								>
									{group.type}
								</span>
								<span className="font-mono text-sm text-foreground flex-1">
									{group.matches.length > 1
										? group.pattern
										: group.matches[0].text}
								</span>
								{group.matches.length > 1 && (
									<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
										{group.matches.length} variants
									</span>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
};

export const Route = createFileRoute("/steps")({
	component: StepsPage,
});
