import {
	useEffect,
	useRef,
	useState,
	useCallback,
	type KeyboardEvent,
} from "react";
import { CalendarClock, Sparkles, Search, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SearchDropdown } from "@/components/SearchDropdown";
import { searchData } from "@/functions/search";
import { formatDate } from "@/functions/date";
import { cn } from "@/lib/utils";
import type { PiccaliMetadata, FolderNode } from "@/types/data";
import type { SelectedFeature } from "@/types/navigation";
import type { SearchResult } from "@/types/search";

type AppHeaderProps = {
	metadata: PiccaliMetadata;
	folders: FolderNode[];
	onSelectResult: (selection: SelectedFeature) => void;
};

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
		const handlePointerDown = (e: PointerEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, []);

	// Global keyboard shortcut: Ctrl+K / Cmd+K
	useEffect(() => {
		const handleGlobalKey = (e: globalThis.KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
				setIsOpen(true);
			}
		};
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

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
	};

	const handleClear = () => {
		setQuery("");
		inputRef.current?.focus();
		setIsOpen(true);
	};

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
