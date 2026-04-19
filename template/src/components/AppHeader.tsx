import { useState } from "react";
import { CalendarClock, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchBar } from "@/components/SearchBar";
import { SettingsModal } from "@/components/SettingsModal";
import { formatDate } from "@/functions/date";
import type { FolderNode } from "@/types/data";
import type { SelectedFeature } from "@/types/navigation";
import type { PiccaliMetadata } from "@/schemas/metadata";

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
	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<header className="flex items-center gap-2 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 z-100">
			<SidebarTrigger className="-ml-1" />

			<Separator orientation="vertical" className="mx-1" />

			<Link
				to="/"
				className="flex items-center gap-2.5 min-w-0 flex-none group"
			>
				<h1 className="text-base font-semibold tracking-tight truncate group-hover:opacity-75 transition-opacity">
					{metadata.title}
				</h1>
			</Link>

			<SearchBar folders={folders} onSelectResult={onSelectResult} />

			<div className="ml-auto flex items-center gap-2 shrink-0">
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<CalendarClock className="size-3.5" />
					<span>Generated {formatDate(metadata.createdAt)}</span>
				</div>
				<Separator orientation="vertical" className="h-5 mx-1" />
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => setSettingsOpen(true)}
							aria-label="Open settings"
							className="text-muted-foreground hover:text-foreground"
						>
							<Settings />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Settings</TooltipContent>
				</Tooltip>
			</div>

			<SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
		</header>
	);
};
