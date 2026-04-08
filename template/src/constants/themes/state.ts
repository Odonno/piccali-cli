import type { CustomThemeOptions, ThemeProviderState } from "@/types/themes";
import { DARK_COLORS } from "./palettes";

export const DEFAULT_CUSTOM_THEME: CustomThemeOptions = {
	inheritFrom: "dark",
	colors: { ...DARK_COLORS },
};

export const initialState: ThemeProviderState = {
	theme: "system",
	resolvedTheme: "dark",
	setTheme: () => null,
	customTheme: DEFAULT_CUSTOM_THEME,
	setCustomTheme: () => null,
	getThemeColors: () => DARK_COLORS,
};
