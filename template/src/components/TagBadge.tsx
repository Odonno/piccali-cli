import { Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/types/data";

/** Renders a single tag as a Badge, optionally wrapped in an <a> link. */
export const TagBadge = ({
	tag,
	small = false,
}: {
	tag: Tag;
	small?: boolean;
}) => {
	const badge = (
		<Badge
			variant="secondary"
			className={
				small
					? "text-[10px] gap-0.5 font-mono h-4 px-1"
					: "gap-1 text-xs font-mono"
			}
		>
			<TagIcon className={small ? "size-2.5" : "size-3"} />
			{tag.name}
		</Badge>
	);

	if (tag.url) {
		return (
			<a href={tag.url} target="_blank" rel="noopener noreferrer">
				{badge}
			</a>
		);
	}

	return badge;
};
