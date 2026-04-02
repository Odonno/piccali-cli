export type StepType = "Given" | "When" | "Then";

export type Tag = {
	name: string;
	url?: string;
};

export type Table = {
	header: string[];
	rows: string[][];
};

export type Step = {
	keyword: string;
	type: StepType;
	text: string;
	doc_string?: string;
	table?: Table;
};

export type Examples = {
	keyword: string;
	name?: string;
	tags?: Tag[];
	table: Table;
};

export type Background = {
	keyword: string;
	steps: Step[];
};

export type Scenario = {
	keyword: string;
	name: string;
	description?: string;
	tags?: Tag[];
	steps: Step[];
	examples?: Examples[];
};

export type Rule = {
	keyword: string;
	name: string;
	description?: string;
	tags?: Tag[];
	background?: Background;
	scenarios?: Scenario[];
};

export type Feature = {
	keyword: string;
	name: string;
	description?: string;
	tags?: Tag[];
	background?: Background;
	scenarios?: Scenario[];
	rules?: Rule[];
};

export type FolderNode = {
	name: string;
	folders?: FolderNode[];
	features?: Feature[];
};

/**
 * A group of steps that match the same regex pattern.
 * When only one unique step text exists, `pattern` equals the original text
 * and `matches` contains only that one step. When multiple steps share the
 * same structure (differing only in quoted-string values), `pattern` is a
 * regex-like string with `(.+)` placeholders and `matches` holds all of them.
 */
export type StepGroup = {
	id: string;
	type: StepType;
	/** Regex-like string with `(.+)` in place of varying quoted values. */
	pattern: string;
	/** All original steps that belong to this group (length >= 1). */
	matches: Step[];
};

export type PiccaliData = {
	folders: FolderNode[];
};

export type PiccaliMetadata = {
	title: string;
	createdAt: string;
};
