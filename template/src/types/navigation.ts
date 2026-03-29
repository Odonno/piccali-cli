/** Path to a feature: array of folder indices leading to it, plus the feature index within that folder. */
export type FeaturePath = {
	folderPath: number[];
	featureIndex: number;
};

export type SelectedFeature =
	| { type: "feature"; path: FeaturePath }
	| { type: "rule"; path: FeaturePath; ruleIndex: number };
