import * as v from "valibot";

const scenarioOutlineImprovements = false;

const MetadataFeaturesSchema = v.object({
	scenarioOutlineImprovements: v.exactOptional(
		v.boolean(),
		scenarioOutlineImprovements,
	),
});

export type PiccaliMetadataFeatures = v.InferOutput<
	typeof MetadataFeaturesSchema
>;

const defaultFeatures: PiccaliMetadataFeatures = {
	scenarioOutlineImprovements,
};

export const MetadataSchema = v.object({
	title: v.exactOptional(v.string(), "Cucumber docs"),
	createdAt: v.pipe(v.string(), v.toDate()),
	styles: v.exactOptional(v.array(v.string()), []),
	scripts: v.exactOptional(v.array(v.string()), []),
	features: v.exactOptional(MetadataFeaturesSchema, defaultFeatures),
});

export type PiccaliMetadata = v.InferOutput<typeof MetadataSchema>;
