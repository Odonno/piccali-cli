import { useEffect } from "react";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/LoadingState";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useAtomValue } from "jotai";
import { dataAtom, metadataAtom } from "@/atoms/state";
import {
	buildFeatureUrl,
	buildRuleUrl,
	resolveFeature,
} from "@/functions/feature";
import type { SelectedFeature } from "@/types/navigation";

const RootComponent = () => {
	const dataLoadable = useAtomValue(dataAtom);
	const metadataLoadable = useAtomValue(metadataAtom);
	const isLoading =
		dataLoadable.state === "loading" || metadataLoadable.state === "loading";
	const data = dataLoadable.state === "hasData" ? dataLoadable.data : null;
	const metadata =
		metadataLoadable.state === "hasData" ? metadataLoadable.data : null;
	const navigate = useNavigate();

	useEffect(() => {
		if (metadata?.title) {
			document.title = metadata.title;
		}
	}, [metadata]);

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
	};

	return (
		<TooltipProvider>
			<SidebarProvider>
				<AppSidebar folders={folders} />
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
							<main>
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
