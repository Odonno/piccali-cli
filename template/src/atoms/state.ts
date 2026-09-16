import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { DataSchema, type PiccaliData } from "@/schemas/data";
import { MetadataSchema, type PiccaliMetadata } from "@/schemas/metadata";
import * as v from "valibot";
import { collectUniqueSteps } from "@/functions/steps";
import { collectFeatures, collectScenarios } from "@/functions/state";
import { isScenarioOutline } from "@/functions/scenario";

const dataAsyncAtom = atom(async () => {
	const res = await fetch("./data.json");
	const data = await res.json();

	return v.parse(DataSchema, data) as PiccaliData;
});

const metadataAsyncAtom = atom(async () => {
	const res = await fetch("./metadata.json");
	const data = await res.json();

	return v.parse(MetadataSchema, data) as PiccaliMetadata;
});

export const dataAtom = unwrap(dataAsyncAtom, () => null);
export const metadataAtom = unwrap(metadataAsyncAtom, () => null);

export const isLoadingAtom = atom((get) => {
	const data = get(dataAtom);
	const metadata = get(metadataAtom);
	return data === null || metadata === null;
});

export const foldersAtom = atom((get) => {
	const data = get(dataAtom);
	return data?.folders ?? [];
});

export const uniqueStepsAtom = atom((get) => {
	const folders = get(foldersAtom);
	return collectUniqueSteps(folders);
});

export const featuresAtom = atom((get) => {
	const folders = get(foldersAtom);
	return collectFeatures(folders);
});

export const scenariosAtom = atom((get) => {
	const features = get(featuresAtom);
	return collectScenarios(features);
});

export const scenarioOutlinesAtom = atom((get) => {
	const scenarios = get(scenariosAtom);
	return scenarios.filter(isScenarioOutline);
});
