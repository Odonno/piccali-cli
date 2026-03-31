import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as internalSlugify from "slugify";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const slugify = (name: string) =>
	internalSlugify.default(name, { lower: true });
