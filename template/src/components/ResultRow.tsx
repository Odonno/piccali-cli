import {
	FileText,
	ListChecks,
	ChevronRight,
	Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HighlightedText } from "@/components/HighlightedText";
import type { SearchResult, SearchResultKind } from "@/types/search";

export const KIND_ICON: Record<SearchResultKind, React.ReactNode> = {
	feature: <FileText className="size-3.5 shrink-0 text-primary" />,
	scenario: <ListChecks className="size-3.5 shrink-0 text-emerald-500" />,
	step: <ChevronRight className="size-3.5 shrink-0 text-amber-500" />,
	tag: <TagIcon className="size-3.5 shrink-0 text-violet-500" />,
};

export const KIND_LABEL: Record<SearchResultKind, string> = {
	feature: "Feature",
	scenario: "Scenario",
	step: "Step",
	tag: "Tag",
};

type ResultRowProps = {
	result: SearchResult;
	query: string;
	isActive: boolean;
	onClick: () => void;
	onMouseEnter: () => void;
};

export const ResultRow = ({
	result,
	query,
	isActive,
	onClick,
	onMouseEnter,
}: ResultRowProps) => (
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
