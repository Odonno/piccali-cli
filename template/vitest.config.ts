import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { redact } from "@tanstack/redact/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		redact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	test: {
		// Inline node_modules so the redact() plugin's React aliasing applies to
		// dependencies too; vitest externalization would mix native React into
		// Redact-rendered components and break hooks.
		server: {
			deps: {
				inline: [/.*/],
			},
		},
		coverage: {
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/routeTree.gen.ts", "src/components/ui", "src/types"],
		},
	},
});
