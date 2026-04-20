import * as v from "valibot";
import { v4 as uuidv4 } from "uuid";

const StepTypeSchema = v.union([
	v.literal("Given"),
	v.literal("When"),
	v.literal("Then"),
]);

const TagSchema = v.object({
	name: v.string(),
	url: v.optional(v.string()),
});

const TableSchema = v.object({
	header: v.array(v.string()),
	rows: v.array(v.array(v.string())),
});

const StepSchema = v.pipe(
	v.object({
		keyword: v.string(),
		type: StepTypeSchema,
		text: v.string(),
		doc_string: v.optional(v.string()),
		table: v.optional(TableSchema),
	}),
	v.transform((step) => ({ ...step, id: uuidv4() })),
);

const ExamplesSchema = v.object({
	keyword: v.string(),
	name: v.optional(v.string()),
	tags: v.optional(v.array(TagSchema)),
	table: TableSchema,
});

const BackgroundSchema = v.object({
	keyword: v.string(),
	steps: v.array(StepSchema),
});

const ScenarioSchema = v.pipe(
	v.object({
		keyword: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		tags: v.optional(v.array(TagSchema)),
		steps: v.array(StepSchema),
		examples: v.optional(v.array(ExamplesSchema)),
	}),
	v.transform((scenario) => ({ ...scenario, id: uuidv4() })),
);

const RuleSchema = v.pipe(
	v.object({
		keyword: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		tags: v.optional(v.array(TagSchema)),
		background: v.optional(BackgroundSchema),
		scenarios: v.optional(v.array(ScenarioSchema)),
	}),
	v.transform((rule) => ({ ...rule, id: uuidv4() })),
);

const FeatureSchema = v.pipe(
	v.object({
		keyword: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		tags: v.optional(v.array(TagSchema)),
		background: v.optional(BackgroundSchema),
		scenarios: v.optional(v.array(ScenarioSchema)),
		rules: v.optional(v.array(RuleSchema)),
	}),
	v.transform((feature) => ({ ...feature, id: uuidv4() })),
);

type FolderNodeInput = {
	name: string;
	folders?: FolderNodeInput[];
	features?: v.InferInput<typeof FeatureSchema>[];
};

type FolderNodeOutput = {
	name: string;
	folders?: FolderNodeOutput[];
	features?: v.InferOutput<typeof FeatureSchema>[];
};

const FolderNodeSchema: v.BaseSchema<
	FolderNodeInput,
	FolderNodeOutput,
	v.BaseIssue<unknown>
> = v.object({
	name: v.string(),
	folders: v.optional(v.array(v.lazy(() => FolderNodeSchema))),
	features: v.optional(v.array(FeatureSchema)),
});

export const DataSchema = v.object({
	folders: v.array(FolderNodeSchema),
});

export type StepType = v.InferOutput<typeof StepTypeSchema>;
export type Tag = v.InferOutput<typeof TagSchema>;
export type Table = v.InferOutput<typeof TableSchema>;
export type StepInput = v.InferInput<typeof StepSchema>;
export type Step = v.InferOutput<typeof StepSchema>;
export type Examples = v.InferOutput<typeof ExamplesSchema>;
export type Background = v.InferOutput<typeof BackgroundSchema>;
export type ScenarioInput = v.InferInput<typeof ScenarioSchema>;
export type Scenario = v.InferOutput<typeof ScenarioSchema>;
export type RuleInput = v.InferInput<typeof RuleSchema>;
export type Rule = v.InferOutput<typeof RuleSchema>;
export type FeatureInput = v.InferInput<typeof FeatureSchema>;
export type Feature = v.InferOutput<typeof FeatureSchema>;
export type FolderNode = FolderNodeOutput;
export type PiccaliData = v.InferOutput<typeof DataSchema>;
