import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { ResultRow, KIND_ICON, KIND_LABEL } from "@/components/ResultRow";
import type { SearchResult, SearchResultKind } from "@/types/search";

type SearchDropdownProps = {
	query: string;
	results: SearchResult[];
	activeIndex: number;
	onActivate: (index: number) => void;
	onSelect: (result: SearchResult) => void;
};

export const SearchDropdown = ({
	query,
	results,
	activeIndex,
	onActivate,
	onSelect,
}: SearchDropdownProps) => {
	const activeRef = useRef<HTMLDivElement>(null);

	// Scroll active item into view
	useEffect(() => {
		activeRef.current?.scrollIntoView({ block: "nearest" });
	}, [activeIndex]);

	if (!query.trim()) {
		return (
			<div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
				<Search className="size-6 text-muted-foreground/40" />
				<p className="text-sm text-muted-foreground">
					Search features, scenarios, steps and tags
				</p>
			</div>
		);
	}

	if (results.length === 0) {
		return (
			<div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
				<Search className="size-6 text-muted-foreground/40" />
				<p className="text-sm text-muted-foreground">
					No results for{" "}
					<span className="font-medium text-foreground">"{query}"</span>
				</p>
			</div>
		);
	}

	// Group results by kind for section headers
	const groups: Array<{
		kind: SearchResultKind;
		items: Array<{ result: SearchResult; globalIndex: number }>;
	}> = [];
	const kinds: SearchResultKind[] = ["feature", "scenario", "step", "tag"];
	for (const kind of kinds) {
		const items = results
			.map((r, i) => ({ result: r, globalIndex: i }))
			.filter(({ result }) => result.kind === kind);
		if (items.length > 0) {
			groups.push({ kind, items });
		}
	}

	return (
		<div role="listbox" className="py-1">
			{groups.map((group) => (
				<div key={group.kind}>
					{/* Section header */}
					<div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
						{KIND_ICON[group.kind]}
						{KIND_LABEL[group.kind]}s
					</div>

					{group.items.map(({ result, globalIndex }) => (
						<div
							key={globalIndex}
							ref={globalIndex === activeIndex ? activeRef : undefined}
						>
							<ResultRow
								result={result}
								query={query}
								isActive={globalIndex === activeIndex}
								onMouseEnter={() => onActivate(globalIndex)}
								onClick={() => onSelect(result)}
							/>
						</div>
					))}
				</div>
			))}

			{results.length >= 50 && (
				<p className="px-3 py-2 text-[11px] text-muted-foreground border-t mt-1">
					Showing first 50 results — refine your query for more precision
				</p>
			)}
		</div>
	);
};
