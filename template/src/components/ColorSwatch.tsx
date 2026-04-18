import { isHexColor } from "@/functions/colors";

/**
 * A color editor component
 */
export const ColorSwatch = ({ color }: { color: string }) => {
	// if it's a readable hex or named color, show it; otherwise show a pattern for complex values
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
};
