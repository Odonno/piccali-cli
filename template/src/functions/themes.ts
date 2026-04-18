import type { ThemeColors } from "@/types/themes";

export const applyColors = (colors: ThemeColors) => {
	for (const [key, value] of Object.entries(colors)) {
		document.documentElement.style.setProperty(`--theme-${key}`, value);
	}
};
