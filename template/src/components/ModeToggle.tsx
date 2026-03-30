import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const CYCLE = ["light", "dark", "system"] as const;
type Theme = (typeof CYCLE)[number];

const LABELS: Record<Theme, string> = {
	light: "Light mode",
	dark: "Dark mode",
	system: "System theme",
};

const NEXT_LABEL: Record<Theme, string> = {
	light: "Switch to dark mode",
	dark: "Switch to system theme",
	system: "Switch to light mode",
};

export function ModeToggle() {
	const { theme, setTheme } = useTheme();

	const currentTheme = (
		CYCLE.includes(theme as Theme) ? theme : "system"
	) as Theme;

	const handleClick = () => {
		const idx = CYCLE.indexOf(currentTheme);
		const next = CYCLE[(idx + 1) % CYCLE.length];
		setTheme(next);
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleClick}
					aria-label={NEXT_LABEL[currentTheme]}
					className="size-8 text-muted-foreground hover:text-foreground"
				>
					{currentTheme === "light" && (
						<Sun className="size-4 transition-all" />
					)}
					{currentTheme === "dark" && (
						<Moon className="size-4 transition-all" />
					)}
					{currentTheme === "system" && (
						<Monitor className="size-4 transition-all" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p>{LABELS[currentTheme]}</p>
			</TooltipContent>
		</Tooltip>
	);
}
