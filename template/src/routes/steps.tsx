import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Search } from "lucide-react";
import { useAtomValue } from "jotai";
import { uniqueStepsAtom } from "@/atoms/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	PRIMARY_STEP_TYPES,
	STEP_TYPE_COLORS,
	STEP_TYPE_ORDER,
} from "@/constants/steps";
import type { StepType } from "@/schemas/data";

const StepsPage = () => {
	const uniqueSteps = useAtomValue(uniqueStepsAtom);

	const [activeTypes, setActiveTypes] = useState<Set<StepType>>(
		new Set(PRIMARY_STEP_TYPES),
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

	const filteredSteps = uniqueSteps
		.filter((group) => {
			if (!activeTypes.has(group.type)) {
				return false;
			}

			if (normalizedSearch) {
				// Match against pattern or any of the original step texts
				const inPattern = group.pattern
					.toLowerCase()
					.includes(normalizedSearch);
				const inMatches = group.matches.some((s) =>
					s.text.toLowerCase().includes(normalizedSearch),
				);
				if (!inPattern && !inMatches) {
					return false;
				}
			}

			return true;
		})
		.toSorted((a, b) => STEP_TYPE_ORDER[a.type] - STEP_TYPE_ORDER[b.type]);

	const isFiltered =
		filteredSteps.length !== uniqueSteps.length ||
		activeTypes.size !== PRIMARY_STEP_TYPES.length ||
		normalizedSearch !== "";

	return (
		<div className="max-w-5xl mx-auto px-6 py-8">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
					<BookOpen className="size-5" />
				</div>
				<div>
					<h1 className="text-xl font-semibold">Step Definitions</h1>
					<p className="text-sm text-muted-foreground">
						{isFiltered
							? `${filteredSteps.length} of ${uniqueSteps.length} step${uniqueSteps.length !== 1 ? "s" : ""} shown`
							: `${uniqueSteps.length} unique step${uniqueSteps.length !== 1 ? "s" : ""} across all features`}
					</p>
				</div>
			</div>

			{/* Controls: toggle filters + search */}
			<div className="flex flex-wrap items-center gap-2 mb-4">
				<div className="flex items-center gap-1">
					{PRIMARY_STEP_TYPES.map((type) => {
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
			{uniqueSteps.length === 0 ? (
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
