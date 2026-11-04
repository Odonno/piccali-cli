import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { CalendarClock, Settings, Terminal } from "lucide-react";
import { useState } from "react";
import { metadataAtom } from "@/atoms/state";
import { SearchBar } from "@/components/SearchBar";
import { SettingsModal } from "@/components/SettingsModal";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/functions/date";

export const AppHeader = () => {
	const metadata = useAtomValue(metadataAtom);

	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<header className="flex items-center gap-5 h-16 px-6 border-b bg-background shrink-0 z-100">
			{/* Brand */}
			<Link to="/" className="flex items-center gap-2.5 shrink-0 group">
				<div className="flex size-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
					<Terminal className="size-4" strokeWidth={2.5} />
				</div>
				<h1 className="text-[15px] font-semibold tracking-tight truncate group-hover:text-primary transition-colors">
					{metadata?.title ?? "Cucumber docs"}
				</h1>
			</Link>

			<SidebarTrigger className="size-7 shrink-0 text-muted-foreground" />

			<SearchBar />

			{/* Actions */}
			<div className="ml-auto flex items-center gap-3.5 shrink-0">
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<CalendarClock className="size-3" />
					{metadata ? (
						<span className="whitespace-nowrap">
							{formatDate(metadata.createdAt)}
						</span>
					) : null}
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setSettingsOpen(true)}
							aria-label="Open settings"
							className="size-8 text-muted-foreground hover:text-foreground"
						>
							<Settings className="size-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Settings</TooltipContent>
				</Tooltip>
			</div>

			<SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
		</header>
	);
};
