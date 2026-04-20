import type { Feature, FolderNode, Scenario } from "@/schemas/data";

export const collectFeatures = (folders: FolderNode[]): Feature[] => {
	return folders.flatMap((folder) => [
		...(folder.features ?? []),
		...collectFeatures(folder.folders ?? []),
	]);
};

export const collectScenarios = (features: Feature[]): Scenario[] => {
	return features.flatMap((feature) => [
		...(feature.scenarios ?? []),
		...(feature.rules ?? []).flatMap((rule) => rule.scenarios ?? []),
	]);
};
