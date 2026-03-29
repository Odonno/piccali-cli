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
			{parts.map((part, i) =>
				part.highlight ? (
					<mark
						key={i}
						className="bg-primary/20 text-primary font-semibold rounded-[2px] px-px"
					>
						{part.text}
					</mark>
				) : (
					<span key={i}>{part.text}</span>
				),
			)}
		</span>
	);
};
