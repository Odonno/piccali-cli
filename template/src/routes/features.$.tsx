import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeatureContent } from "@/components/FeatureContent";
import { useAtomValue } from "jotai";
import { foldersAtom } from "@/atoms/state";
import { resolveFeatureBySlug, resolveRuleBySlug } from "@/functions/feature";

const FeatureOrRulePage = () => {
	const { _splat } = Route.useParams();
	const navigate = useNavigate();

	const folders = useAtomValue(foldersAtom);

	const segments = (_splat ?? "").split("/").filter(Boolean);

	// Detect rule URL: contains "/rules/" segment
	const rulesIdx = segments.indexOf("rules");
	const isRulePage = rulesIdx !== -1 && rulesIdx === segments.length - 2;

	const featureSegments = isRulePage ? segments.slice(0, rulesIdx) : segments;
	const ruleSlug = isRulePage ? segments[segments.length - 1] : null;

	const resolved = resolveFeatureBySlug(folders, featureSegments);

	if (!resolved) {
		return (
			<div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-center h-64 text-muted-foreground">
				Feature not found.
			</div>
		);
	}

	const { feature, path } = resolved;

	// Resolve rule if on a rule page
	const resolvedRule =
		ruleSlug && feature ? resolveRuleBySlug(feature, ruleSlug) : null;

	if (isRulePage && !resolvedRule) {
		return (
			<div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-center h-64 text-muted-foreground">
				Rule not found.
			</div>
		);
	}

	// If this is a rule page but the URL has no /rules/ — redirect to feature
	// (defensive: shouldn't happen but handle gracefully)
	if (ruleSlug && !resolvedRule) {
		navigate({ to: `/features/${featureSegments.join("/")}` });
		return null;
	}

	return (
		<FeatureContent feature={feature} path={path} rule={resolvedRule?.rule} />
	);
};

export const Route = createFileRoute("/features/$")({
	component: FeatureOrRulePage,
});
