/**
 * Renders a step text string, replacing <variable> placeholders with
 * highlighted spans when vars are provided.
 */
export const StepTextWithVars = ({
	text,
	vars,
}: {
	text: string;
	vars: Record<string, string> | null;
}) => {
	if (!vars) return <span>{text}</span>;

	// Split on <varname> tokens
	const parts = text.split(/(<[^>]+>)/g);
	return (
		<span>
			{parts.map((part, index) => {
				const match = part.match(/^<([^>]+)>$/);
				if (match) {
					const varName = match[1];
					const value = vars[varName];
					if (value !== undefined) {
						return (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: required
								key={index}
								className="rounded px-1 py-0.5 text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/60 font-semibold font-mono text-[0.8em]"
							>
								{value}
							</span>
						);
					}
				}
				// biome-ignore lint/suspicious/noArrayIndexKey: required
				return <span key={index}>{part}</span>;
			})}
		</span>
	);
};
