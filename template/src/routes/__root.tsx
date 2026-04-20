import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/LoadingState";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useAtomValue } from "jotai";
import { isLoadingAtom } from "@/atoms/state";
import { useLoadScripts } from "@/hooks/useLoadScripts";
import { useLoadStyles } from "@/hooks/useLoadStyles";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const RootComponent = () => {
	const isLoading = useAtomValue(isLoadingAtom);

	useDocumentTitle();
	useLoadStyles();
	useLoadScripts();

	if (isLoading) {
		return <LoadingState />;
	}

	return (
		<TooltipProvider>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<div className="flex flex-col h-svh">
						<AppHeader />

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
