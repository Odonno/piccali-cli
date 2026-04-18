import path from "node:path";
import { defineConfig } from "vitest/config";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		babel({ presets: [reactCompilerPreset()] }),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		browser: {
			enabled: false,
			provider: playwright(),
			headless: true,
			instances: [{ browser: "chromium" }],
		},
		coverage: {
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/routeTree.gen.ts", "src/components/ui", "src/types"],
		},
	},
});
