export const isHexColor = (value: string): boolean => {
	return /^#[0-9a-fA-F]{3,8}$/.test(value.trim());
};

export const getSystemTheme = (): "light" | "dark" => {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

export const getSystemLabel = (): string => {
	return `System (${getSystemTheme()})`;
};
