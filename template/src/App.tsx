import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/LoadingState";
import { AppSidebar } from "@/components/AppSidebar";
import type { SelectedFeature } from "@/types/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EmptySelection } from "@/components/EmptySelection";
import { FeatureContent } from "@/components/FeatureContent";
import { useDataContext } from "@/hooks/useDataContext";
import { resolveFeature } from "@/functions/feature";
import type { Feature, Rule } from "@/types/data";

export const App = () => {
	const { data, metadata, isLoading } = useDataContext();
	const [selected, setSelected] = useState<SelectedFeature | null>(null);

	useEffect(() => {
		if (metadata?.title) {
			document.title = metadata.title;
		}
	}, [metadata]);

	if (isLoading) {
		return <LoadingState />;
	}

	const folders = data?.folders ?? [];

	// Resolve what's being viewed
	let selectedFeature: Feature | undefined;
	let selectedRule: Rule | undefined;

	if (selected !== null) {
		selectedFeature = resolveFeature(
			folders,
			selected.path.folderPath,
			selected.path.featureIndex,
		);
		if (selected.type === "rule" && selectedFeature) {
			selectedRule = selectedFeature.rules?.[selected.ruleIndex];
		}
	}

	/** Navigate to a rule from the feature's rules list. */
	const handleSelectRule = (ruleIndex: number) => {
		if (!selected) return;
		setSelected({
			type: "rule",
			path: selected.path,
			ruleIndex,
		});
	};

	return (
		<TooltipProvider>
			<SidebarProvider>
				<AppSidebar
					folders={folders}
					selected={selected}
					onSelect={setSelected}
				/>
				<SidebarInset>
					<div className="flex flex-col h-svh">
						{metadata && (
							<AppHeader
								metadata={metadata}
								folders={folders}
								onSelectResult={setSelected}
							/>
						)}

						<ScrollArea className="flex-1">
							<main className="p-6">
								{selected === null || !selectedFeature ? (
									<div className="h-[calc(100svh-4rem)] flex items-center justify-center">
										<EmptySelection />
									</div>
								) : (
									<FeatureContent
										feature={selectedFeature}
										rule={selectedRule}
										onSelectRule={handleSelectRule}
									/>
								)}
							</main>
						</ScrollArea>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
};
