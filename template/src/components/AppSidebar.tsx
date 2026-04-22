import { BookOpen } from "lucide-react";
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
import { countFeaturesInFolders } from "@/functions/feature";
import { FolderTree } from "@/components/FolderTree";
import { foldersAtom } from "@/atoms/state";
import { useAtomValue } from "jotai";

export const AppSidebar = () => {
	const folders = useAtomValue(foldersAtom);
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
							<div className="flex size-8 items-center justify-center rounded-lg bg-yellow-50/60 shrink-0">
								<img src="/logo.png" alt="" className="size-7" />
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
