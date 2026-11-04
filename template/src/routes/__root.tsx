import {
	createRootRoute,
	ErrorComponent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAtomValue } from "jotai";
import { isLoadingAtom } from "@/atoms/state";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { LoadingState } from "@/components/LoadingState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLoadScripts } from "@/hooks/useLoadScripts";
import { useLoadStyles } from "@/hooks/useLoadStyles";

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
				<div className="flex flex-col h-svh w-full">
					<AppHeader />

					<div className="flex flex-1 min-h-0">
						<AppSidebar />
						<SidebarInset className="flex-1 min-w-0">
							<ScrollArea className="h-full">
								<main>
									<Outlet />
								</main>
							</ScrollArea>
						</SidebarInset>
					</div>
				</div>
			</SidebarProvider>

			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</TooltipProvider>
	);
};

export const Route = createRootRoute({
	component: RootComponent,
	errorComponent: ({ error }) => <ErrorComponent error={error} />,
});
