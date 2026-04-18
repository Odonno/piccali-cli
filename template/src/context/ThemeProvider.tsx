import {
	CUSTOM_THEME_STORAGE_KEY,
	THEME_STORAGE_KEY,
} from "@/constants/storage/themes";
import {
	CATPPUCCIN_FRAPPE_COLORS,
	CATPPUCCIN_LATTE_COLORS,
	CATPPUCCIN_MACCHIATO_COLORS,
	CATPPUCCIN_MOCHA_COLORS,
	DARK_COLORS,
	LIGHT_COLORS,
} from "@/constants/themes/palettes";
import { DEFAULT_CUSTOM_THEME, initialState } from "@/constants/themes/state";
import { getSystemTheme } from "@/functions/colors";
import { applyColors } from "@/functions/themes";
import type {
	AppTheme,
	CustomThemeOptions,
	ThemeColorKey,
	ThemeColors,
	ThemeProviderState,
} from "@/types/themes";
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	useCallback,
} from "react";

export const THEME_COLORS_MAP: Record<
	Exclude<AppTheme, "system" | "custom">,
	ThemeColors
> = {
	light: LIGHT_COLORS,
	dark: DARK_COLORS,
	"catppuccin-latte": CATPPUCCIN_LATTE_COLORS,
	"catppuccin-frappe": CATPPUCCIN_FRAPPE_COLORS,
	"catppuccin-macchiato": CATPPUCCIN_MACCHIATO_COLORS,
	"catppuccin-mocha": CATPPUCCIN_MOCHA_COLORS,
};

export const THEME_LABELS: Record<AppTheme, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
	"catppuccin-latte": "Catppuccin — Latte",
	"catppuccin-frappe": "Catppuccin — Frappé",
	"catppuccin-macchiato": "Catppuccin — Macchiato",
	"catppuccin-mocha": "Catppuccin — Mocha",
	custom: "Custom",
};

export const COLOR_KEY_LABELS: Record<ThemeColorKey, string> = {
	background: "Background",
	foreground: "Foreground",
	card: "Card",
	"card-foreground": "Card Foreground",
	popover: "Popover",
	"popover-foreground": "Popover Foreground",
	primary: "Primary",
	"primary-foreground": "Primary Foreground",
	secondary: "Secondary",
	"secondary-foreground": "Secondary Foreground",
	muted: "Muted",
	"muted-foreground": "Muted Foreground",
	accent: "Accent",
	"accent-foreground": "Accent Foreground",
	destructive: "Destructive",
	border: "Border",
	input: "Input",
	ring: "Ring / Focus",
	sidebar: "Sidebar",
	"sidebar-foreground": "Sidebar Foreground",
	"sidebar-primary": "Sidebar Primary",
	"sidebar-primary-foreground": "Sidebar Primary Foreground",
	"type-boolean": "Type: Boolean",
	"type-number": "Type: Number",
	"type-date": "Type: Date",
	"type-string": "Type: String",
};

export const COLOR_KEYS_ORDER: ThemeColorKey[] = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"border",
	"input",
	"ring",
	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"type-boolean",
	"type-number",
	"type-date",
	"type-string",
];

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

type ThemeProviderProps = {
	children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
	const [theme, setThemeState] = useState<AppTheme>(() => {
		const stored = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
		return stored ?? "system";
	});

	const [customTheme, setCustomThemeState] = useState<CustomThemeOptions>(
		() => {
			try {
				const stored = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
				if (stored) {
					return JSON.parse(stored) as CustomThemeOptions;
				}
			} catch {
				// ignore
			}
			return DEFAULT_CUSTOM_THEME;
		},
	);

	const customThemeRef = useRef(customTheme);
	customThemeRef.current = customTheme;

	const getThemeColors = useCallback(
		(t: Exclude<AppTheme, "system">): ThemeColors => {
			if (t === "custom") {
				return customThemeRef.current.colors;
			}
			return THEME_COLORS_MAP[t];
		},
		[],
	);

	const resolveTheme = useCallback(
		(t: AppTheme): Exclude<AppTheme, "system"> => {
			if (t === "system") {
				return getSystemTheme();
			}
			return t;
		},
		[],
	);

	const resolvedTheme = resolveTheme(theme);

	// Apply theme class + CSS variables to document
	useEffect(() => {
		const root = document.documentElement;

		// Remove all theme-related classes
		root.classList.remove(
			"light",
			"dark",
			"catppuccin-latte",
			"catppuccin-frappe",
			"catppuccin-macchiato",
			"catppuccin-mocha",
			"custom",
		);

		const resolved = resolveTheme(theme);

		// Determine dark/light class for shadcn components
		const isDark = resolved !== "light" && resolved !== "catppuccin-latte";
		root.classList.add(isDark ? "dark" : "light");

		// Apply palette-specific class
		root.classList.add(resolved);

		// Apply CSS variable overrides
		const colors = getThemeColors(resolved);
		applyColors(colors);
	}, [theme, resolveTheme, getThemeColors]);

	// Watch system preference changes when on "system" theme
	useEffect(() => {
		if (theme !== "system") {
			return;
		}

		const mq = window.matchMedia("(prefers-color-scheme: dark)");

		const handler = () => {
			const root = document.documentElement;
			root.classList.remove("light", "dark");
			root.classList.add(mq.matches ? "dark" : "light");
			const colors = getThemeColors(mq.matches ? "dark" : "light");
			applyColors(colors);
		};

		mq.addEventListener("change", handler);
		return () => {
			mq.removeEventListener("change", handler);
		};
	}, [theme, getThemeColors]);

	const setTheme = useCallback((t: AppTheme) => {
		localStorage.setItem(THEME_STORAGE_KEY, t);
		setThemeState(t);
	}, []);

	const setCustomTheme = useCallback((opts: CustomThemeOptions) => {
		localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(opts));
		setCustomThemeState(opts);
	}, []);

	return (
		<ThemeProviderContext.Provider
			value={{
				theme,
				resolvedTheme,
				setTheme,
				customTheme,
				setCustomTheme,
				getThemeColors,
			}}
		>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}

	return context;
};
