import { useEffect, useState } from "react";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/LoadingState";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useDataContext } from "@/hooks/useDataContext";
import {
	buildFeatureUrl,
	buildRuleUrl,
	resolveFeature,
} from "@/functions/feature";
import type { SelectedFeature } from "@/types/navigation";

const RootComponent = () => {
	const { data, metadata, isLoading } = useDataContext();
	const navigate = useNavigate();

	useEffect(() => {
		if (metadata?.title) {
			document.title = metadata.title;
		}
	}, [metadata]);

	// Track sidebar open state for folders
	const [openKeys, setOpenKeys] = useState<Record<string, boolean>>(() => {
		const init: Record<string, boolean> = {};
		init["0"] = true;
		return init;
	});

	if (isLoading) {
		return <LoadingState />;
	}

	const folders = data?.folders ?? [];

	const handleSelectResult = (selection: SelectedFeature) => {
		const feature = resolveFeature(
			folders,
			selection.path.folderPath,
			selection.path.featureIndex,
		);
		if (!feature) return;

		if (selection.type === "rule") {
			const rule = feature.rules?.[selection.ruleIndex];
			if (rule) {
				void navigate({ to: buildRuleUrl(folders, selection.path, rule) });
				return;
			}
		}

		void navigate({ to: buildFeatureUrl(folders, selection.path) });
	};

	return (
		<TooltipProvider>
			<SidebarProvider>
				<AppSidebar
					folders={folders}
					openKeys={openKeys}
					setOpenKeys={setOpenKeys}
				/>
				<SidebarInset>
					<div className="flex flex-col h-svh">
						{metadata && (
							<AppHeader
								metadata={metadata}
								folders={folders}
								onSelectResult={handleSelectResult}
							/>
						)}

						<ScrollArea className="flex-1">
							<main className="p-6">
								<Outlet />
							</main>
						</ScrollArea>
					</div>
				</SidebarInset>
			</SidebarProvider>
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</TooltipProvider>
	);
};

export const Route = createRootRoute({
	component: RootComponent,
});
