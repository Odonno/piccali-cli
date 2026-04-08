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
