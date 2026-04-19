import { atom } from "jotai";
import { loadable } from "jotai/utils";
import type { PiccaliData } from "@/types/data";
import { MetadataSchema, type PiccaliMetadata } from "@/schemas/metadata";
import * as v from "valibot";

const dataAsyncAtom = atom(async () => {
	const res = await fetch("/data.json");
	return res.json() as Promise<PiccaliData>;
});

const metadataAsyncAtom = atom(async () => {
	const res = await fetch("/metadata.json");
	const data = await res.json();

	return v.parse(MetadataSchema, data) as PiccaliMetadata;
});

export const dataAtom = loadable(dataAsyncAtom);
export const metadataAtom = loadable(metadataAsyncAtom);
