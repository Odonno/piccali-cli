import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		babel({ presets: [reactCompilerPreset()] }),
		// Remove the generated data.json from the build output — it is produced at
		// Cargo build time and should not be bundled as a static asset.
		{
			name: "exclude-data-json",
			closeBundle() {
				const outPath = path.resolve(__dirname, "dist", "data.json");
				if (fs.existsSync(outPath)) {
					fs.unlinkSync(outPath);
				}
			},
		},
		{
			name: "exclude-metadata-json",
			closeBundle() {
				const outPath = path.resolve(__dirname, "dist", "metadata.json");
				if (fs.existsSync(outPath)) {
					fs.unlinkSync(outPath);
				}
			},
		},
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
