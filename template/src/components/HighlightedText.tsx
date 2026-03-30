import { highlightMatches } from "@/functions/search";

export const HighlightedText = ({
	text,
	query,
}: {
	text: string;
	query: string;
}) => {
	const parts = highlightMatches(text, query);
	return (
		<span>
			{parts.map((part, index) =>
				part.highlight ? (
					<mark
						// biome-ignore lint/suspicious/noArrayIndexKey: required
						key={index}
						className="bg-primary/20 text-primary font-semibold rounded-[2px] px-px"
					>
						{part.text}
					</mark>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: required
					<span key={index}>{part.text}</span>
				),
			)}
		</span>
	);
};
