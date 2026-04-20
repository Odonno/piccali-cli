import { atom } from "jotai";
import { loadable } from "jotai/utils";
import { DataSchema, type PiccaliData } from "@/schemas/data";
import { MetadataSchema, type PiccaliMetadata } from "@/schemas/metadata";
import * as v from "valibot";
import { collectUniqueSteps } from "@/functions/steps";

const dataAsyncAtom = atom(async () => {
	const res = await fetch("/data.json");
	const data = await res.json();

	return v.parse(DataSchema, data) as PiccaliData;
});

const metadataAsyncAtom = atom(async () => {
	const res = await fetch("/metadata.json");
	const data = await res.json();

	return v.parse(MetadataSchema, data) as PiccaliMetadata;
});

const dataLoadableAtom = loadable(dataAsyncAtom);
const metadataLoadableAtom = loadable(metadataAsyncAtom);

export const isLoadingAtom = atom((get) => {
	const dataLoadable = get(dataLoadableAtom);
	const metadataLoadable = get(metadataLoadableAtom);
	return (
		dataLoadable.state === "loading" && metadataLoadable.state === "loading"
	);
});

export const dataAtom = atom((get) => {
	const loadable = get(dataLoadableAtom);
	return loadable.state === "hasData" ? loadable.data : null;
});

export const metadataAtom = atom((get) => {
	const loadable = get(metadataLoadableAtom);
	return loadable.state === "hasData" ? loadable.data : null;
});

export const foldersAtom = atom((get) => {
	const data = get(dataAtom);
	return data?.folders ?? [];
});

export const uniqueStepsAtom = atom((get) => {
	const folders = get(foldersAtom);
	return collectUniqueSteps(folders);
});
