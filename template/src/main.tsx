import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import "./index.css";
import { DataContextProvider } from "@/context/DataContextProvider.tsx";
import { ThemeProvider } from "@/context/ThemeProvider.tsx";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// biome-ignore lint/style/noNonNullAssertion: should exist
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system" storageKey="piccali-ui-theme">
			<DataContextProvider>
				<RouterProvider router={router} />
			</DataContextProvider>
		</ThemeProvider>
	</StrictMode>,
);
