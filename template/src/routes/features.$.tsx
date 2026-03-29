import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeatureContent } from "@/components/FeatureContent";
import { useDataContext } from "@/hooks/useDataContext";
import {
	resolveFeatureBySlug,
	resolveRuleBySlug,
	buildRuleUrl,
} from "@/functions/feature";

const FeatureOrRulePage = () => {
	const { _splat } = Route.useParams();
	const { data } = useDataContext();
	const navigate = useNavigate();

	const folders = data?.folders ?? [];
	const segments = (_splat ?? "").split("/").filter(Boolean);

	// Detect rule URL: contains "/rules/" segment
	const rulesIdx = segments.indexOf("rules");
	const isRulePage = rulesIdx !== -1 && rulesIdx === segments.length - 2;

	const featureSegments = isRulePage ? segments.slice(0, rulesIdx) : segments;
	const ruleSlug = isRulePage ? segments[segments.length - 1] : null;

	const resolved = resolveFeatureBySlug(folders, featureSegments);

	if (!resolved) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground">
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
			<div className="flex items-center justify-center h-64 text-muted-foreground">
				Rule not found.
			</div>
		);
	}

	const getRuleUrl = (ruleIndex: number): string => {
		const rule = feature.rules?.[ruleIndex];
		if (!rule) return "/";
		return buildRuleUrl(folders, path, rule);
	};

	// If this is a rule page but the URL has no /rules/ — redirect to feature
	// (defensive: shouldn't happen but handle gracefully)
	if (ruleSlug && !resolvedRule) {
		void navigate({ to: `/features/${featureSegments.join("/")}` });
		return null;
	}

	return (
		<FeatureContent
			feature={feature}
			rule={resolvedRule?.rule}
			getRuleUrl={getRuleUrl}
		/>
	);
};

export const Route = createFileRoute("/features/$")({
	component: FeatureOrRulePage,
});
