import type { FolderNode, Scenario, Step, StepGroup } from "@/types/data";

const isScenarioOutline = (scenario: Scenario): boolean =>
	scenario.keyword.includes("Outline");

const toPattern = (text: string): string =>
	text
		.replace(/"[^"]*"/g, '"(.+)"')
		.replace(/<[^>]+>/g, "(.+)")
		.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "(\\d{4}-\\d{2}-\\d{2})")
		.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "(\\d{2}/\\d{2}/\\d{4})")
		.replace(/\b\d+(\.\d+)?\b/g, "(\\d+)");

const toSlug = (type: string, pattern: string): string =>
	`${type}-${pattern}`
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const stepSignaturePart = (step: Step): string =>
	`${step.type}:${toPattern(step.text)}`;

const scenarioSignature = (scenario: Scenario): string =>
	scenario.steps.map(stepSignaturePart).join("||");

const hasTextVariations = (
	scenarios: Scenario[],
	indices: number[],
): boolean => {
	if (indices.length < 2) return false;

	const reference = scenarios[indices[0]];
	for (let stepIndex = 0; stepIndex < reference.steps.length; stepIndex++) {
		const values = new Set(
			indices.map((index) => scenarios[index].steps[stepIndex]?.text ?? ""),
		);
		if (values.size > 1) return true;
	}

	return false;
};

/** Build StepGroup[] for one scenario (outline or regular scenario). */
export const computeScenarioStepGroups = (scenario: Scenario): StepGroup[] => {
	const groupMap = new Map<string, StepGroup>();

	for (const step of scenario.steps) {
		const pattern = toPattern(step.text);
		const groupKey = `${step.type}:${pattern}`;

		const existing = groupMap.get(groupKey);
		if (existing) {
			existing.matches.push(step);
			continue;
		}

		groupMap.set(groupKey, {
			id: toSlug(step.type, pattern),
			type: step.type,
			pattern,
			matches: [step],
		});
	}

	return Array.from(groupMap.values());
};

export type ScenarioOutlineImprovement = {
	stepGroups: StepGroup[];
	matchingOutlineIndices: number[];
	groupableScenarioIndices: number[];
	signature: string;
};

/**
 * For one scenario list (feature-level or rule-level), detect outline improvements:
 * - regular scenarios that fit existing Scenario Outlines
 * - regular scenarios that can be grouped together into a new Scenario Outline
 */
export const analyzeScenarioOutlineImprovements = (
	scenarios: Scenario[],
): ScenarioOutlineImprovement[] => {
	const profiles = scenarios.map((scenario) => ({
		isOutline: isScenarioOutline(scenario),
		signature: scenarioSignature(scenario),
		stepGroups: computeScenarioStepGroups(scenario),
	}));

	const outlineBySignature = new Map<string, number[]>();
	const regularBySignature = new Map<string, number[]>();

	for (
		let scenarioIndex = 0;
		scenarioIndex < profiles.length;
		scenarioIndex++
	) {
		const profile = profiles[scenarioIndex];
		const target = profile.isOutline ? outlineBySignature : regularBySignature;
		const existing = target.get(profile.signature) ?? [];
		existing.push(scenarioIndex);
		target.set(profile.signature, existing);
	}

	const groupableSignatures = new Set<string>();
	for (const [signature, indices] of regularBySignature.entries()) {
		if (indices.length < 2) continue;
		if (hasTextVariations(scenarios, indices)) {
			groupableSignatures.add(signature);
		}
	}

	return profiles.map((profile, scenarioIndex) => {
		if (profile.isOutline) {
			return {
				stepGroups: profile.stepGroups,
				matchingOutlineIndices: [],
				groupableScenarioIndices: [],
				signature: profile.signature,
			};
		}

		const matchingOutlineIndices =
			outlineBySignature
				.get(profile.signature)
				?.filter((index) => index !== scenarioIndex) ?? [];

		const groupableScenarioIndices = groupableSignatures.has(profile.signature)
			? (regularBySignature.get(profile.signature) ?? []).filter(
					(index) => index !== scenarioIndex,
				)
			: [];

		return {
			stepGroups: profile.stepGroups,
			matchingOutlineIndices,
			groupableScenarioIndices,
			signature: profile.signature,
		};
	});
};

export type ScenarioOutlineImprovementSummary = {
	scenariosMatchingOutline: number;
	scenariosGroupableIntoOutline: number;
	outlineGroupCandidates: number;
};

const analyzeSections = (folders: FolderNode[]): Scenario[][] => {
	const sections: Scenario[][] = [];

	const walkFolders = (nodes: FolderNode[]) => {
		for (const folder of nodes) {
			for (const feature of folder.features ?? []) {
				if ((feature.scenarios?.length ?? 0) > 0) {
					sections.push(feature.scenarios ?? []);
				}
				for (const rule of feature.rules ?? []) {
					if ((rule.scenarios?.length ?? 0) > 0) {
						sections.push(rule.scenarios ?? []);
					}
				}
			}

			walkFolders(folder.folders ?? []);
		}
	};

	walkFolders(folders);

	return sections;
};

/** Aggregate overview metrics for scenario-outline improvement warnings. */
export const collectScenarioOutlineImprovementSummary = (
	folders: FolderNode[],
): ScenarioOutlineImprovementSummary => {
	let scenariosMatchingOutline = 0;
	let scenariosGroupableIntoOutline = 0;
	let outlineGroupCandidates = 0;

	for (const scenarios of analyzeSections(folders)) {
		const improvements = analyzeScenarioOutlineImprovements(scenarios);
		const candidateSignatures = new Set<string>();

		for (
			let scenarioIndex = 0;
			scenarioIndex < scenarios.length;
			scenarioIndex++
		) {
			const scenario = scenarios[scenarioIndex];
			if (isScenarioOutline(scenario)) continue;

			const improvement = improvements[scenarioIndex];
			if (improvement.matchingOutlineIndices.length > 0) {
				scenariosMatchingOutline += 1;
			}
			if (improvement.groupableScenarioIndices.length > 0) {
				scenariosGroupableIntoOutline += 1;
				candidateSignatures.add(improvement.signature);
			}
		}

		outlineGroupCandidates += candidateSignatures.size;
	}

	return {
		scenariosMatchingOutline,
		scenariosGroupableIntoOutline,
		outlineGroupCandidates,
	};
};
