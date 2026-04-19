import * as v from "valibot";

export const MetadataSchema = v.object({
	title: v.exactOptional(v.string(), "Cucumber docs"),
	createdAt: v.pipe(v.string(), v.toDate()),
	styles: v.exactOptional(v.array(v.string()), []),
	scripts: v.exactOptional(v.array(v.string()), []),
});

export type PiccaliMetadata = v.InferOutput<typeof MetadataSchema>;
