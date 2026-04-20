import type { Scenario, Step } from "@/schemas/data";
import type { StepGroup } from "@/types/steps";
import { isScenarioOutline } from "./scenario";

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

const hasTextVariations = (scenarios: Scenario[], ids: string[]): boolean => {
	if (ids.length < 2) {
		return false;
	}

	const scenarioById = new Map(scenarios.map((s) => [s.id, s]));
	const reference = scenarioById.get(ids[0]);
	if (!reference) return false;

	for (let stepIndex = 0; stepIndex < reference.steps.length; stepIndex++) {
		const values = new Set(
			ids.map((id) => scenarioById.get(id)?.steps[stepIndex]?.text ?? ""),
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
			matches: [step as Step],
		});
	}

	return Array.from(groupMap.values());
};

export type ScenarioOutlineImprovement = {
	scenarioId: string;
	outlineId: string | undefined;
};

/**
 * For one scenario list (feature-level or rule-level), detect outline improvements:
 * - regular scenarios that fit an existing Scenario Outline → outlineId set
 * - regular scenarios that can be grouped together into a new Scenario Outline → outlineId undefined
 *
 * If a scenario matches an existing outline, that takes priority over groupable candidates.
 */
export const analyzeScenarioOutlineImprovements = (
	scenarios: Scenario[],
): ScenarioOutlineImprovement[] => {
	const outlineBySignature = new Map<string, string>(); // signature → first outline id
	const regularBySignature = new Map<string, string[]>(); // signature → regular scenario ids

	for (const scenario of scenarios) {
		const sig = scenarioSignature(scenario);
		if (isScenarioOutline(scenario)) {
			if (!outlineBySignature.has(sig)) {
				outlineBySignature.set(sig, scenario.id);
			}
		} else {
			const existing = regularBySignature.get(sig) ?? [];
			existing.push(scenario.id);
			regularBySignature.set(sig, existing);
		}
	}

	// Signatures where 2+ regular scenarios can form a new outline
	const groupableSignatures = new Set<string>();
	for (const [sig, ids] of regularBySignature.entries()) {
		if (ids.length >= 2 && hasTextVariations(scenarios, ids)) {
			groupableSignatures.add(sig);
		}
	}

	const improvements: ScenarioOutlineImprovement[] = [];

	for (const scenario of scenarios) {
		if (isScenarioOutline(scenario)) continue;

		const sig = scenarioSignature(scenario);
		const matchingOutlineId = outlineBySignature.get(sig);

		if (matchingOutlineId !== undefined) {
			improvements.push({
				scenarioId: scenario.id,
				outlineId: matchingOutlineId,
			});
		} else if (groupableSignatures.has(sig)) {
			improvements.push({ scenarioId: scenario.id, outlineId: undefined });
		}
	}

	return improvements;
};
