import { Monitor, Sun, Moon } from "lucide-react";
import type { ReactNode } from "react";

export const THEME_ICONS: Record<string, ReactNode> = {
	system: <Monitor className="size-3.5" />,
	light: <Sun className="size-3.5" />,
	dark: <Moon className="size-3.5" />,
};
