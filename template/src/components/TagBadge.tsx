import { Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/schemas/data";

/** Renders a single tag as a Badge, optionally wrapped in an <a> link. */
export const TagBadge = ({
	tag,
	small = false,
}: {
	tag: Tag;
	small?: boolean;
}) => {
	const className = small
		? "text-[10px] gap-0.5 font-mono h-4 px-1"
		: "gap-1 text-xs font-mono";

	const icon = <TagIcon className={small ? "size-2.5" : "size-3"} />;

	if (tag.url) {
		return (
			<Badge
				variant="secondary"
				className={`${className} cursor-pointer hover:bg-secondary/80 transition-colors`}
				asChild
			>
				<a href={tag.url} target="_blank" rel="noopener noreferrer">
					{icon}
					{tag.name}
				</a>
			</Badge>
		);
	}

	return (
		<Badge variant="secondary" className={className}>
			{icon}
			{tag.name}
		</Badge>
	);
};
