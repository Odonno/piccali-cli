import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import "./index.css";
import { ThemeProvider } from "@/context/ThemeProvider.tsx";
import { routeTree } from "./routeTree.gen";

const raw = document.querySelector("base")?.getAttribute("href") ?? "/";
const basepath = raw.endsWith("/") ? raw.slice(0, -1) || "/" : raw;

const router = createRouter({
	routeTree,
	basepath,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// biome-ignore lint/style/noNonNullAssertion: should exist
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider>
			<RouterProvider router={router} />
		</ThemeProvider>
	</StrictMode>,
);
