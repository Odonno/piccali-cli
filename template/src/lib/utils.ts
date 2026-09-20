import * as internalSlugify from "slugify";

export { cn } from "cn";

export const slugify = (name: string) =>
	internalSlugify.default(name, {
		lower: true,
		remove: /['']/g,
		strict: true, // strict strips URL-hostile chars (/ ? # & + ~ …) so slugs stay one route segment
	});
