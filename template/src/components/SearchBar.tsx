import { useEffect, useRef, useCallback, type KeyboardEvent } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Search, X } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { SearchDropdown } from "@/components/SearchDropdown";
import { searchData } from "@/functions/search";
import { cn } from "@/lib/utils";
import {
	searchQueryAtom,
	searchIsOpenAtom,
	searchActiveIndexAtom,
} from "@/atoms/search";
import type { SelectedFeature } from "@/types/navigation";
import type { SearchResult } from "@/types/search";
import { foldersAtom } from "@/atoms/state";
import {
	buildFeatureUrl,
	buildRuleUrl,
	resolveFeature,
} from "@/functions/feature";
import { useNavigate } from "@tanstack/react-router";

export const SearchBar = () => {
	const [query, setQuery] = useAtom(searchQueryAtom);
	const [isOpen, setIsOpen] = useAtom(searchIsOpenAtom);
	const [activeIndex, setActiveIndex] = useAtom(searchActiveIndexAtom);

	const folders = useAtomValue(foldersAtom);

	const navigate = useNavigate();

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
	}, [setIsOpen]);

	useHotkey(
		"Mod+K",
		() => {
			inputRef.current?.focus();
			inputRef.current?.select();
			setIsOpen(true);
		},
		{ preventDefault: true },
	);

	const handleSelectResult = useCallback(
		(selection: SelectedFeature) => {
			const feature = resolveFeature(
				folders,
				selection.path.folderPath,
				selection.path.featureIndex,
			);
			if (!feature) {
				return;
			}

			if (selection.type === "rule") {
				const rule = feature.rules?.[selection.ruleIndex];
				if (rule) {
					navigate({ to: buildRuleUrl(folders, selection.path, rule) });
					return;
				}
			}

			navigate({ to: buildFeatureUrl(folders, selection.path) });
		},
		[folders, navigate],
	);

	const handleSelect = useCallback(
		(result: SearchResult) => {
			handleSelectResult(result.selection);
			setIsOpen(false);
			setQuery("");
			inputRef.current?.blur();
		},
		[handleSelectResult, setIsOpen, setQuery],
	);

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (!isOpen) {
			return;
		}

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
		<div ref={containerRef} className="relative flex-1 max-w-lg mx-4">
			{/* Input */}
			<div
				className={cn(
					"flex items-center gap-2 rounded-lg border bg-muted/50 px-3 h-8",
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
	);
};
