import {
	useEffect,
	useRef,
	useState,
	useCallback,
	type KeyboardEvent,
} from "react";
import {
	CalendarClock,
	Sparkles,
	Search,
	FileText,
	ListChecks,
	ChevronRight,
	Tag as TagIcon,
	X,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { PiccaliMetadata, FolderNode } from "@/lib/types";
import type { SelectedFeature } from "@/components/AppSidebar";
import {
	searchData,
	highlightMatches,
	type SearchResult,
	type SearchResultKind,
} from "@/lib/search";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
	metadata: PiccaliMetadata;
	folders: FolderNode[];
	onSelectResult: (selection: SelectedFeature) => void;
};

function formatDate(isoString: string): string {
	try {
		const date = new Date(isoString);
		return date.toLocaleString("en-GB", {
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return isoString;
	}
}

// ---------------------------------------------------------------------------
// Highlight text component
// ---------------------------------------------------------------------------

function HighlightedText({ text, query }: { text: string; query: string }) {
	const parts = highlightMatches(text, query);
	return (
		<span>
			{parts.map((part, i) =>
				part.highlight ? (
					<mark
						key={i}
						className="bg-primary/20 text-primary font-semibold rounded-[2px] px-px"
					>
						{part.text}
					</mark>
				) : (
					<span key={i}>{part.text}</span>
				),
			)}
		</span>
	);
}

// ---------------------------------------------------------------------------
// Kind icon + label
// ---------------------------------------------------------------------------

const KIND_ICON: Record<SearchResultKind, React.ReactNode> = {
	feature: <FileText className="size-3.5 shrink-0 text-primary" />,
	scenario: <ListChecks className="size-3.5 shrink-0 text-emerald-500" />,
	step: <ChevronRight className="size-3.5 shrink-0 text-amber-500" />,
	tag: <TagIcon className="size-3.5 shrink-0 text-violet-500" />,
};

const KIND_LABEL: Record<SearchResultKind, string> = {
	feature: "Feature",
	scenario: "Scenario",
	step: "Step",
	tag: "Tag",
};

// ---------------------------------------------------------------------------
// Single result row
// ---------------------------------------------------------------------------

function ResultRow({
	result,
	query,
	isActive,
	onClick,
	onMouseEnter,
}: {
	result: SearchResult;
	query: string;
	isActive: boolean;
	onClick: () => void;
	onMouseEnter: () => void;
}) {
	return (
		<button
			type="button"
			role="option"
			aria-selected={isActive}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
			className={cn(
				"w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors",
				"focus:outline-none",
				isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
			)}
		>
			{/* Kind icon */}
			<span className="mt-0.5 flex-none">{KIND_ICON[result.kind]}</span>

			{/* Text */}
			<span className="flex flex-col gap-0.5 min-w-0">
				<span className="text-sm leading-snug truncate">
					<HighlightedText text={result.label} query={query} />
				</span>
				<span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
					<span className="truncate">{result.breadcrumb}</span>
					{result.scenarioName && (
						<>
							<span className="opacity-40">·</span>
							<span className="italic truncate">{result.scenarioName}</span>
						</>
					)}
				</span>
				{result.kind === "tag" && result.matchedTag && (
					<span className="flex items-center gap-1 mt-0.5">
						<span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
							<TagIcon className="size-2.5" />
							<HighlightedText text={result.matchedTag.name} query={query} />
						</span>
					</span>
				)}
			</span>
		</button>
	);
}

// ---------------------------------------------------------------------------
// Search dropdown
// ---------------------------------------------------------------------------

function SearchDropdown({
	query,
	results,
	activeIndex,
	onActivate,
	onSelect,
}: {
	query: string;
	results: SearchResult[];
	activeIndex: number;
	onActivate: (index: number) => void;
	onSelect: (result: SearchResult) => void;
}) {
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
	let globalIdx = 0;
	const kinds: SearchResultKind[] = ["feature", "scenario", "step", "tag"];
	for (const kind of kinds) {
		const items = results
			.map((r, i) => ({ result: r, globalIndex: i }))
			.filter(({ result }) => result.kind === kind);
		if (items.length > 0) {
			groups.push({ kind, items });
		}
		globalIdx += items.length;
	}
	void globalIdx;

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
}

// ---------------------------------------------------------------------------
// AppHeader
// ---------------------------------------------------------------------------

export const AppHeader = ({
	metadata,
	folders,
	onSelectResult,
}: AppHeaderProps) => {
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const results = searchData(folders, query);

	// Close on outside click
	useEffect(() => {
		function handlePointerDown(e: PointerEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		}
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, []);

	// Global keyboard shortcut: Ctrl+K / Cmd+K
	useEffect(() => {
		function handleGlobalKey(e: globalThis.KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
				setIsOpen(true);
			}
		}
		document.addEventListener("keydown", handleGlobalKey);
		return () => document.removeEventListener("keydown", handleGlobalKey);
	}, []);

	const handleSelect = useCallback(
		(result: SearchResult) => {
			onSelectResult(result.selection);
			setIsOpen(false);
			setQuery("");
			inputRef.current?.blur();
		},
		[onSelectResult],
	);

	function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		if (!isOpen) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((i) => Math.min(i + 1, results.length - 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((i) => Math.max(i - 1, 0));
				break;
			case "Enter":
				e.preventDefault();
				if (results[activeIndex]) {
					handleSelect(results[activeIndex]);
				}
				break;
			case "Escape":
				e.preventDefault();
				setIsOpen(false);
				inputRef.current?.blur();
				break;
		}
	}

	function handleClear() {
		setQuery("");
		inputRef.current?.focus();
		setIsOpen(true);
	}

	return (
		<header className="flex items-center gap-2 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 z-100">
			<SidebarTrigger className="-ml-1" />

			<Separator orientation="vertical" className="h-5 mx-1" />

			<div className="flex items-center gap-2.5 min-w-0 flex-none">
				<div className="flex items-center gap-1.5 shrink-0">
					<Sparkles className="size-4 text-primary" />
				</div>
				<h1 className="text-base font-semibold tracking-tight truncate">
					{metadata.title}
				</h1>
			</div>

			{/* Search bar — grows to fill available space */}
			<div ref={containerRef} className="relative flex-1 max-w-lg mx-4">
				{/* Input */}
				<div
					className={cn(
						"flex items-center gap-2 rounded-md border bg-background px-3 h-8",
						"transition-shadow duration-150",
						isOpen
							? "ring-2 ring-ring ring-offset-1 border-ring/50"
							: "hover:border-border/80",
					)}
				>
					<Search className="size-3.5 text-muted-foreground/60 shrink-0" />
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						aria-expanded={isOpen}
						aria-controls="search-results-listbox"
						aria-autocomplete="list"
						aria-activedescendant={
							isOpen && results[activeIndex]
								? `search-result-${activeIndex}`
								: undefined
						}
						placeholder="Search…"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setActiveIndex(0);
							setIsOpen(true);
						}}
						onFocus={() => setIsOpen(true)}
						onKeyDown={handleKeyDown}
						className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 min-w-0"
					/>
					{query ? (
						<button
							type="button"
							onClick={handleClear}
							className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
							aria-label="Clear search"
						>
							<X className="size-3.5" />
						</button>
					) : (
						<kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/40 font-mono border border-border/50 rounded px-1 py-0.5 select-none">
							⌘K
						</kbd>
					)}
				</div>

				{/* Results dropdown */}
				{isOpen && (
					<div
						id="search-results-listbox"
						className={cn(
							"absolute top-full left-0 right-0 mt-1.5 z-50",
							"bg-popover text-popover-foreground rounded-md border shadow-lg",
							"max-h-[420px] overflow-y-auto",
							// Subtle entry animation
							"animate-in fade-in-0 slide-in-from-top-1 duration-100",
						)}
					>
						<SearchDropdown
							query={query}
							results={results}
							activeIndex={activeIndex}
							onActivate={setActiveIndex}
							onSelect={handleSelect}
						/>
					</div>
				)}
			</div>

			<div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
				<CalendarClock className="size-3.5" />
				<span>Generated {formatDate(metadata.createdAt)}</span>
			</div>
		</header>
	);
};
