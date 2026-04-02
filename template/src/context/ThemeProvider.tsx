import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	useCallback,
} from "react";

export type AppTheme =
	| "system"
	| "light"
	| "dark"
	| "catppuccin-latte"
	| "catppuccin-frappe"
	| "catppuccin-macchiato"
	| "catppuccin-mocha"
	| "custom";

export type ThemeColorKey =
	// Backgrounds
	| "background"
	| "foreground"
	| "card"
	| "card-foreground"
	| "popover"
	| "popover-foreground"
	// Primary / interactive
	| "primary"
	| "primary-foreground"
	| "secondary"
	| "secondary-foreground"
	| "muted"
	| "muted-foreground"
	| "accent"
	| "accent-foreground"
	| "destructive"
	| "border"
	| "input"
	| "ring"
	// Sidebar
	| "sidebar"
	| "sidebar-foreground"
	| "sidebar-primary"
	| "sidebar-primary-foreground"
	// Data type colors
	| "type-boolean"
	| "type-number"
	| "type-date"
	| "type-string";

export type ThemeColors = Record<ThemeColorKey, string>;

export type CustomThemeOptions = {
	inheritFrom?: Exclude<AppTheme, "system" | "custom">;
	colors: ThemeColors;
};

export type ThemeProviderState = {
	theme: AppTheme;
	resolvedTheme: Exclude<AppTheme, "system">;
	setTheme: (theme: AppTheme) => void;
	customTheme: CustomThemeOptions;
	setCustomTheme: (opts: CustomThemeOptions) => void;
	getThemeColors: (theme: Exclude<AppTheme, "system">) => ThemeColors;
};

// --- Color palettes ---

const LIGHT_COLORS: ThemeColors = {
	background: "#ffffff",
	foreground: "#09090b",
	card: "#ffffff",
	"card-foreground": "#09090b",
	popover: "#ffffff",
	"popover-foreground": "#09090b",
	primary: "#3b4cf8",
	"primary-foreground": "#f8fafc",
	secondary: "#f4f4f5",
	"secondary-foreground": "#18181b",
	muted: "#f4f4f5",
	"muted-foreground": "#71717a",
	accent: "#f4f4f5",
	"accent-foreground": "#18181b",
	destructive: "#ef4444",
	border: "#e4e4e7",
	input: "#e4e4e7",
	ring: "#a1a1aa",
	sidebar: "#fafafa",
	"sidebar-foreground": "#09090b",
	"sidebar-primary": "#3b4cf8",
	"sidebar-primary-foreground": "#f8fafc",
	// boolean → blue-600, number → emerald-600, date → amber-600, string → rose-600
	"type-boolean": "#2563eb",
	"type-number": "#059669",
	"type-date": "#d97706",
	"type-string": "#e11d48",
};

const DARK_COLORS: ThemeColors = {
	background: "#09090b",
	foreground: "#fafafa",
	card: "#18181b",
	"card-foreground": "#fafafa",
	popover: "#18181b",
	"popover-foreground": "#fafafa",
	primary: "#818cf8",
	"primary-foreground": "#0f172a",
	secondary: "#27272a",
	"secondary-foreground": "#fafafa",
	muted: "#27272a",
	"muted-foreground": "#a1a1aa",
	accent: "#27272a",
	"accent-foreground": "#fafafa",
	destructive: "#f87171",
	border: "rgba(255,255,255,0.1)",
	input: "rgba(255,255,255,0.15)",
	ring: "#818cf8",
	sidebar: "#18181b",
	"sidebar-foreground": "#fafafa",
	"sidebar-primary": "#818cf8",
	"sidebar-primary-foreground": "#0f172a",
	// boolean → blue-400, number → emerald-400, date → amber-400, string → rose-400
	"type-boolean": "#60a5fa",
	"type-number": "#34d399",
	"type-date": "#fbbf24",
	"type-string": "#fb7185",
};

const CATPPUCCIN_LATTE_COLORS: ThemeColors = {
	background: "#eff1f5",
	foreground: "#4c4f69",
	card: "#e6e9ef",
	"card-foreground": "#4c4f69",
	popover: "#e6e9ef",
	"popover-foreground": "#4c4f69",
	primary: "#1e66f5",
	"primary-foreground": "#eff1f5",
	secondary: "#ccd0da",
	"secondary-foreground": "#4c4f69",
	muted: "#ccd0da",
	"muted-foreground": "#6c6f85",
	accent: "#bcc0cc",
	"accent-foreground": "#4c4f69",
	destructive: "#d20f39",
	border: "#acb0be",
	input: "#bcc0cc",
	ring: "#7287fd",
	sidebar: "#e6e9ef",
	"sidebar-foreground": "#4c4f69",
	"sidebar-primary": "#1e66f5",
	"sidebar-primary-foreground": "#eff1f5",
	// boolean → Latte Blue, number → Latte Green, date → Latte Yellow, string → Latte Maroon
	"type-boolean": "#1e66f5",
	"type-number": "#40a02b",
	"type-date": "#df8e1d",
	"type-string": "#e64553",
};

const CATPPUCCIN_FRAPPE_COLORS: ThemeColors = {
	background: "#303446",
	foreground: "#c6d0f5",
	card: "#292c3c",
	"card-foreground": "#c6d0f5",
	popover: "#292c3c",
	"popover-foreground": "#c6d0f5",
	primary: "#8caaee",
	"primary-foreground": "#303446",
	secondary: "#414559",
	"secondary-foreground": "#c6d0f5",
	muted: "#414559",
	"muted-foreground": "#a5adce",
	accent: "#51576d",
	"accent-foreground": "#c6d0f5",
	destructive: "#e78284",
	border: "rgba(198,208,245,0.15)",
	input: "rgba(198,208,245,0.2)",
	ring: "#babbf1",
	sidebar: "#292c3c",
	"sidebar-foreground": "#c6d0f5",
	"sidebar-primary": "#8caaee",
	"sidebar-primary-foreground": "#303446",
	// boolean → Frappé Blue, number → Frappé Green, date → Frappé Yellow, string → Frappé Maroon
	"type-boolean": "#8caaee",
	"type-number": "#a6d189",
	"type-date": "#e5c890",
	"type-string": "#ea999c",
};

const CATPPUCCIN_MACCHIATO_COLORS: ThemeColors = {
	background: "#24273a",
	foreground: "#cad3f5",
	card: "#1e2030",
	"card-foreground": "#cad3f5",
	popover: "#1e2030",
	"popover-foreground": "#cad3f5",
	primary: "#8aadf4",
	"primary-foreground": "#24273a",
	secondary: "#363a4f",
	"secondary-foreground": "#cad3f5",
	muted: "#363a4f",
	"muted-foreground": "#a5adcb",
	accent: "#494d64",
	"accent-foreground": "#cad3f5",
	destructive: "#ed8796",
	border: "rgba(202,211,245,0.15)",
	input: "rgba(202,211,245,0.2)",
	ring: "#b7bdf8",
	sidebar: "#1e2030",
	"sidebar-foreground": "#cad3f5",
	"sidebar-primary": "#8aadf4",
	"sidebar-primary-foreground": "#24273a",
	// boolean → Macchiato Blue, number → Macchiato Green, date → Macchiato Yellow, string → Macchiato Maroon
	"type-boolean": "#8aadf4",
	"type-number": "#a6da95",
	"type-date": "#eed49f",
	"type-string": "#ee99a0",
};

const CATPPUCCIN_MOCHA_COLORS: ThemeColors = {
	background: "#1e1e2e",
	foreground: "#cdd6f4",
	card: "#181825",
	"card-foreground": "#cdd6f4",
	popover: "#181825",
	"popover-foreground": "#cdd6f4",
	primary: "#89b4fa",
	"primary-foreground": "#1e1e2e",
	secondary: "#313244",
	"secondary-foreground": "#cdd6f4",
	muted: "#313244",
	"muted-foreground": "#a6adc8",
	accent: "#45475a",
	"accent-foreground": "#cdd6f4",
	destructive: "#f38ba8",
	border: "rgba(205,214,244,0.15)",
	input: "rgba(205,214,244,0.2)",
	ring: "#b4befe",
	sidebar: "#181825",
	"sidebar-foreground": "#cdd6f4",
	"sidebar-primary": "#89b4fa",
	"sidebar-primary-foreground": "#1e1e2e",
	// boolean → Mocha Blue, number → Mocha Green, date → Mocha Yellow, string → Mocha Maroon
	"type-boolean": "#89b4fa",
	"type-number": "#a6e3a1",
	"type-date": "#f9e2af",
	"type-string": "#eba0ac",
};

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

const COLOR_KEYS_ORDER: ThemeColorKey[] = [
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

export { COLOR_KEYS_ORDER };

// --- Helper to apply colors to the document root ---
function applyColors(colors: ThemeColors) {
	const root = document.documentElement;
	for (const [key, value] of Object.entries(colors)) {
		root.style.setProperty(`--theme-${key}`, value);
	}
}

function getSystemTheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

const STORAGE_KEY = "piccali-ui-theme";
const STORAGE_CUSTOM_KEY = "piccali-ui-theme-custom";

const DEFAULT_CUSTOM_THEME: CustomThemeOptions = {
	inheritFrom: "dark",
	colors: { ...DARK_COLORS },
};

const initialState: ThemeProviderState = {
	theme: "system",
	resolvedTheme: "dark",
	setTheme: () => null,
	customTheme: DEFAULT_CUSTOM_THEME,
	setCustomTheme: () => null,
	getThemeColors: () => DARK_COLORS,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

type ThemeProviderProps = {
	children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
	const [theme, setThemeState] = useState<AppTheme>(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
		return stored ?? "system";
	});

	const [customTheme, setCustomThemeState] = useState<CustomThemeOptions>(
		() => {
			try {
				const stored = localStorage.getItem(STORAGE_CUSTOM_KEY);
				if (stored) return JSON.parse(stored) as CustomThemeOptions;
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
			if (t === "custom") return customThemeRef.current.colors;
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
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => {
			const root = document.documentElement;
			root.classList.remove("light", "dark");
			root.classList.add(mq.matches ? "dark" : "light");
			const colors = getThemeColors(mq.matches ? "dark" : "light");
			applyColors(colors);
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme, getThemeColors]);

	const setTheme = useCallback((t: AppTheme) => {
		localStorage.setItem(STORAGE_KEY, t);
		setThemeState(t);
	}, []);

	const setCustomTheme = useCallback((opts: CustomThemeOptions) => {
		localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(opts));
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
	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");
	return context;
};
