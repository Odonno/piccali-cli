import { atom } from "jotai";
import { loadable } from "jotai/utils";
import type { PiccaliData, PiccaliMetadata } from "@/types/data";

const dataAsyncAtom = atom(async () => {
	const res = await fetch("/data.json");
	return res.json() as Promise<PiccaliData>;
});

const metadataAsyncAtom = atom(async () => {
	const res = await fetch("/metadata.json");
	return res.json() as Promise<PiccaliMetadata>;
});

export const dataAtom = loadable(dataAsyncAtom);
export const metadataAtom = loadable(metadataAsyncAtom);
