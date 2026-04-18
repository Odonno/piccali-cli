import { Layers, BookOpen } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import type { FolderNode } from "@/types/data";
import { countFeaturesInFolders } from "@/functions/feature";
import { FolderTree } from "@/components/FolderTree";

type AppSidebarProps = {
	folders: FolderNode[];
};

export const AppSidebar = ({ folders }: AppSidebarProps) => {
	const totalFeatures = countFeaturesInFolders(folders);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							className="pointer-events-none"
							tooltip="Features"
						>
							<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
								<Layers className="size-4" />
							</div>
							<div className="flex flex-col gap-0.5 leading-none">
								<span className="font-semibold text-sm">Features</span>
								<span className="text-xs text-muted-foreground">
									{totalFeatures} file{totalFeatures !== 1 ? "s" : ""}
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="flex items-center gap-1.5">
						<BookOpen className="size-3.5" />
						Feature Files
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<FolderTree
								folders={folders}
								rootFolders={folders}
								folderPath={[]}
							/>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarRail />
		</Sidebar>
	);
};
