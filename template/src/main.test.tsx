// @vitest-environment jsdom
// Boots the real app entry so the React runtime used by the production
// bundle (Redact via vitest.config.ts) is exercised, not just plain React.
import { expect, test, vi } from "vitest";

test("app boots and renders the router", async () => {
	// jsdom lacks matchMedia, which ThemeProvider reads at render time
	window.matchMedia =
		window.matchMedia ??
		((query: string) =>
			({
				matches: false,
				media: query,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
			}) as MediaQueryList);
	document.body.innerHTML = '<div id="root"></div>';

	await import("./main");

	const root = document.getElementById("root");
	expect(root).not.toBeNull();
	await vi.waitFor(() => {
		expect(root?.innerHTML).not.toBe("");
	});
});
