import { useState, useCallback } from "react";
import { Monitor, Sun, Moon, Palette, Copy, Check } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useTheme,
	THEME_LABELS,
	COLOR_KEY_LABELS,
	COLOR_KEYS_ORDER,
	THEME_COLORS_MAP,
} from "@/context/ThemeProvider";
import { cn } from "@/lib/utils";
import type { AppTheme, ThemeColorKey } from "@/types/themes";

type SettingsModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const THEME_ICONS: Record<string, React.ReactNode> = {
	system: <Monitor className="size-3.5" />,
	light: <Sun className="size-3.5" />,
	dark: <Moon className="size-3.5" />,
};

function getSystemLabel(): string {
	const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	return `System (${isDark ? "dark" : "light"})`;
}

function isHexColor(value: string): boolean {
	return /^#[0-9a-fA-F]{3,8}$/.test(value.trim());
}

function ColorSwatch({ color }: { color: string }) {
	// If it's a readable hex or named color, show it; otherwise show a pattern for complex values
	const isReadable =
		isHexColor(color) || /^rgb/.test(color) || /^oklch/.test(color);
	return (
		<div
			className="size-4 rounded border border-border/50 shrink-0"
			style={
				isReadable
					? { backgroundColor: color }
					: {
							background:
								"repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, transparent 0, transparent 50%) 0 / 4px 4px",
						}
			}
			title={color}
		/>
	);
}

type CopiedKey = ThemeColorKey | null;

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
	const { theme, setTheme, customTheme, setCustomTheme, getThemeColors } =
		useTheme();
	const [systemLabel] = useState(getSystemLabel);
	const [copied, setCopied] = useState<CopiedKey>(null);

	const activeColors =
		theme === "system"
			? getThemeColors(
					window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light",
				)
			: getThemeColors(theme);

	const isCustom = theme === "custom";
	const isEditable = isCustom;

	const handleCopy = useCallback((key: ThemeColorKey, value: string) => {
		navigator.clipboard.writeText(value).catch(() => {});
		setCopied(key);
		setTimeout(() => setCopied(null), 1200);
	}, []);

	const handleCustomColorChange = useCallback(
		(key: ThemeColorKey, value: string) => {
			setCustomTheme({
				...customTheme,
				colors: { ...customTheme.colors, [key]: value },
			});
		},
		[customTheme, setCustomTheme],
	);

	const handleInheritFrom = useCallback(
		(inheritFrom: string) => {
			const sourceTheme = inheritFrom as Exclude<AppTheme, "system" | "custom">;
			const sourceColors = THEME_COLORS_MAP[sourceTheme];
			setCustomTheme({
				inheritFrom: sourceTheme,
				colors: { ...sourceColors },
			});
		},
		[setCustomTheme],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg w-full">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-sm font-semibold">
						<Palette className="size-4 text-primary" />
						Settings
					</DialogTitle>
					<DialogDescription>
						Customize the appearance of the viewer.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 pt-1">
					{/* Theme selector */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="theme-select"
							className="text-xs font-medium text-foreground"
						>
							Theme
						</label>
						<Select
							value={theme}
							onValueChange={(v) => setTheme(v as AppTheme)}
						>
							<SelectTrigger
								id="theme-select"
								size="default"
								className="w-full h-8 text-xs"
							>
								<SelectValue>
									<span className="flex items-center gap-2">
										{THEME_ICONS[theme] ?? <Palette className="size-3.5" />}
										{theme === "system" ? systemLabel : THEME_LABELS[theme]}
									</span>
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Base</SelectLabel>
									<SelectItem value="system">
										<span className="flex items-center gap-2">
											<Monitor className="size-3.5" />
											{systemLabel}
										</span>
									</SelectItem>
									<SelectItem value="light">
										<span className="flex items-center gap-2">
											<Sun className="size-3.5" />
											Light
										</span>
									</SelectItem>
									<SelectItem value="dark">
										<span className="flex items-center gap-2">
											<Moon className="size-3.5" />
											Dark
										</span>
									</SelectItem>
								</SelectGroup>
								<SelectSeparator />
								<SelectGroup>
									<SelectLabel>Catppuccin</SelectLabel>
									<SelectItem value="catppuccin-latte">Latte</SelectItem>
									<SelectItem value="catppuccin-frappe">Frappé</SelectItem>
									<SelectItem value="catppuccin-macchiato">
										Macchiato
									</SelectItem>
									<SelectItem value="catppuccin-mocha">Mocha</SelectItem>
								</SelectGroup>
								<SelectSeparator />
								<SelectGroup>
									<SelectItem value="custom">
										<span className="flex items-center gap-2">
											<Palette className="size-3.5" />
											Custom
										</span>
									</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					{/* Inherit from (only for custom) */}
					{isCustom && (
						<div className="flex flex-col gap-2">
							<label
								htmlFor="inherit-select"
								className="text-xs font-medium text-foreground"
							>
								Inherit colors from
							</label>
							<Select
								value={customTheme.inheritFrom ?? "dark"}
								onValueChange={handleInheritFrom}
							>
								<SelectTrigger
									id="inherit-select"
									size="default"
									className="w-full h-8 text-xs"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="light">Light</SelectItem>
										<SelectItem value="dark">Dark</SelectItem>
									</SelectGroup>
									<SelectSeparator />
									<SelectGroup>
										<SelectLabel>Catppuccin</SelectLabel>
										<SelectItem value="catppuccin-latte">Latte</SelectItem>
										<SelectItem value="catppuccin-frappe">Frappé</SelectItem>
										<SelectItem value="catppuccin-macchiato">
											Macchiato
										</SelectItem>
										<SelectItem value="catppuccin-mocha">Mocha</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Color palette viewer */}
					<div className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-foreground">
							Color Palette
						</span>
						<ScrollArea className="h-[280px] rounded-md border border-border/60">
							<div className="p-2 flex flex-col gap-0.5">
								{COLOR_KEYS_ORDER.map((key) => {
									const value = activeColors[key];
									const label = COLOR_KEY_LABELS[key];
									const isTypeKey = key.startsWith("type-");

									return (
										<div
											key={key}
											className={cn(
												"group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
												isTypeKey ? "bg-muted/30" : "hover:bg-muted/40",
											)}
										>
											<ColorSwatch color={value} />
											<span className="flex-1 text-xs text-muted-foreground truncate min-w-0">
												{label}
											</span>

											{isEditable ? (
												<Input
													value={value}
													onChange={(e) =>
														handleCustomColorChange(key, e.target.value)
													}
													className="h-6 w-28 px-1.5 text-[10px] font-mono text-right"
												/>
											) : (
												<button
													type="button"
													onClick={() => handleCopy(key, value)}
													className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70 hover:text-foreground transition-colors group-hover:opacity-100 opacity-60"
													title="Copy value"
												>
													<span className="truncate max-w-[96px]">{value}</span>
													{copied === key ? (
														<Check className="size-3 text-green-500 shrink-0" />
													) : (
														<Copy className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
													)}
												</button>
											)}
										</div>
									);
								})}
							</div>
						</ScrollArea>
					</div>

					{/* Footer close */}
					<div className="flex justify-end pt-1">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
