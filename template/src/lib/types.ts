export type StepType = "Given" | "When" | "Then";

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
  tags?: string[];
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
  tags?: string[];
  steps: Step[];
  examples?: Examples[];
};

export type Rule = {
  keyword: string;
  name: string;
  description?: string;
  tags?: string[];
  background?: Background;
  scenarios?: Scenario[];
};

export type Feature = {
  keyword: string;
  name: string;
  description?: string;
  tags?: string[];
  background?: Background;
  scenarios?: Scenario[];
  rules?: Rule[];
};

export type PiccaliData = {
  features: Feature[];
};

export type PiccaliMetadata = {
  title: string;
  createdAt: string;
};
