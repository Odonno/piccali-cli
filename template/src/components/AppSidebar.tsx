import { useState } from "react";
import {
	FileText,
	ChevronRight,
	Layers,
	BookOpen,
	ListChecks,
	Tag as TagIcon,
	Folder,
	FolderOpen,
} from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Feature, FolderNode } from "@/lib/types";

/** Path to a feature: array of folder indices leading to it, plus the feature index within that folder. */
export type FeaturePath = {
	folderPath: number[];
	featureIndex: number;
};

export type SelectedFeature =
	| { type: "feature"; path: FeaturePath }
	| { type: "rule"; path: FeaturePath; ruleIndex: number };

type AppSidebarProps = {
	folders: FolderNode[];
	selected: SelectedFeature | null;
	onSelect: (selection: SelectedFeature) => void;
};

function featureScenarioCount(feature: Feature): number {
	const direct = feature.scenarios?.length ?? 0;
	const fromRules =
		feature.rules?.reduce((sum, r) => sum + (r.scenarios?.length ?? 0), 0) ?? 0;
	return direct + fromRules;
}

function folderTotalScenarioCount(folder: FolderNode): number {
	const fromFeatures =
		folder.features?.reduce((sum, f) => sum + featureScenarioCount(f), 0) ?? 0;
	const fromSubFolders =
		folder.folders?.reduce((sum, f) => sum + folderTotalScenarioCount(f), 0) ??
		0;
	return fromFeatures + fromSubFolders;
}

function featureLabel(feature: Feature): string {
	return feature.name || feature.keyword;
}

function isSameFeaturePath(a: FeaturePath, b: FeaturePath): boolean {
	return (
		a.featureIndex === b.featureIndex &&
		a.folderPath.length === b.folderPath.length &&
		a.folderPath.every((v, i) => v === b.folderPath[i])
	);
}

function isFeatureSelected(
	selected: SelectedFeature | null,
	path: FeaturePath,
): boolean {
	return selected !== null && isSameFeaturePath(selected.path, path);
}

function isRuleSelected(
	selected: SelectedFeature | null,
	path: FeaturePath,
	ruleIndex: number,
): boolean {
	return (
		selected?.type === "rule" &&
		isSameFeaturePath(selected.path, path) &&
		selected.ruleIndex === ruleIndex
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type FolderTreeProps = {
	folders: FolderNode[];
	folderPath: number[];
	selected: SelectedFeature | null;
	onSelect: (s: SelectedFeature) => void;
	openKeys: Record<string, boolean>;
	toggleKey: (key: string) => void;
	depth?: number;
};

function folderKey(folderPath: number[]): string {
	return folderPath.join(".");
}

function FolderTree({
	folders,
	folderPath,
	selected,
	onSelect,
	openKeys,
	toggleKey,
	depth = 0,
}: FolderTreeProps) {
	return (
		<>
			{folders.map((folder, folderIdx) => {
				const currentPath = [...folderPath, folderIdx];
				const key = folderKey(currentPath);
				const isOpen = openKeys[key] ?? false;
				const count = folderTotalScenarioCount(folder);
				const hasChildren =
					(folder.folders?.length ?? 0) > 0 ||
					(folder.features?.length ?? 0) > 0;

				return (
					<Collapsible
						key={key}
						open={isOpen}
						onOpenChange={() => toggleKey(key)}
						className="group/collapsible"
						asChild
					>
						<SidebarMenuItem>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton
									className={cn(depth > 0 && "pl-4")}
									tooltip={folder.name}
								>
									{isOpen ? (
										<FolderOpen className="shrink-0 text-muted-foreground" />
									) : (
										<Folder className="shrink-0 text-muted-foreground" />
									)}
									<span className="truncate font-medium">{folder.name}</span>
									{count > 0 && (
										<Badge
											variant="outline"
											className={cn(
												"ml-auto shrink-0 text-[10px] h-4 px-1.5",
												"group-data-[state=open]/collapsible:hidden",
											)}
										>
											{count}
										</Badge>
									)}
									{hasChildren && (
										<ChevronRight
											className={cn(
												"size-3.5 shrink-0 transition-transform duration-200",
												"group-data-[state=open]/collapsible:rotate-90",
												count > 0 &&
													"group-data-[state=closed]/collapsible:hidden",
											)}
										/>
									)}
								</SidebarMenuButton>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<SidebarMenuSub>
									{/* Sub-folders */}
									{(folder.folders?.length ?? 0) > 0 && (
										<SidebarMenu>
											<FolderTree
												folders={folder.folders ?? []}
												folderPath={currentPath}
												selected={selected}
												onSelect={onSelect}
												openKeys={openKeys}
												toggleKey={toggleKey}
												depth={depth + 1}
											/>
										</SidebarMenu>
									)}

									{/* Feature files in this folder */}
									{folder.features?.map((feature, featureIdx) => {
										const featurePath: FeaturePath = {
											folderPath: currentPath,
											featureIndex: featureIdx,
										};
										const hasRules = (feature.rules?.length ?? 0) > 0;
										const featureCount = featureScenarioCount(feature);
										const featureIsActive = isFeatureSelected(
											selected,
											featurePath,
										);
										const featureItemKey = `${key}.f${featureIdx}`;
										const isFeatureOpen = openKeys[featureItemKey] ?? false;

										if (!hasRules) {
											return (
												<SidebarMenuSubItem key={featureIdx}>
													<Tooltip>
														<TooltipTrigger asChild>
															<SidebarMenuSubButton
																isActive={featureIsActive}
																onClick={() =>
																	onSelect({
																		type: "feature",
																		path: featurePath,
																	})
																}
															>
																<FileText className="shrink-0" />
																<span className="truncate">
																	{featureLabel(feature)}
																</span>
																{featureCount > 0 && (
																	<Badge
																		variant="secondary"
																		className="ml-auto shrink-0 text-[10px] h-4 px-1.5"
																	>
																		{featureCount}
																	</Badge>
																)}
															</SidebarMenuSubButton>
														</TooltipTrigger>
														<TooltipContent side="right">
															<p className="font-medium">
																{featureLabel(feature)}
															</p>
															{feature.tags && feature.tags.length > 0 && (
																<div className="flex flex-wrap gap-1 mt-1">
																	{feature.tags.map((tag) => {
																		const content = (
																			<span
																				key={tag.name}
																				className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
																			>
																				<TagIcon className="size-2.5" />
																				{tag.name}
																			</span>
																		);
																		return tag.url ? (
																			<a
																				key={tag.name}
																				href={tag.url}
																				target="_blank"
																				rel="noopener noreferrer"
																			>
																				{content}
																			</a>
																		) : (
																			content
																		);
																	})}
																</div>
															)}
														</TooltipContent>
													</Tooltip>
												</SidebarMenuSubItem>
											);
										}

										// Feature with rules — nested collapsible inside the folder
										return (
											<Collapsible
												key={featureIdx}
												open={isFeatureOpen}
												onOpenChange={() => toggleKey(featureItemKey)}
												className="group/feature-collapsible"
												asChild
											>
												<SidebarMenuSubItem>
													<CollapsibleTrigger asChild>
														<SidebarMenuSubButton
															isActive={featureIsActive}
															onClick={() =>
																onSelect({
																	type: "feature",
																	path: featurePath,
																})
															}
														>
															<FileText className="shrink-0" />
															<span className="truncate">
																{featureLabel(feature)}
															</span>
															{featureCount > 0 && (
																<Badge
																	variant="secondary"
																	className={cn(
																		"ml-auto shrink-0 text-[10px] h-4 px-1.5",
																		"group-data-[state=open]/feature-collapsible:hidden",
																	)}
																>
																	{featureCount}
																</Badge>
															)}
															<ChevronRight
																className={cn(
																	"size-3.5 shrink-0 transition-transform duration-200",
																	"group-data-[state=open]/feature-collapsible:rotate-90",
																	featureCount > 0 &&
																		"group-data-[state=closed]/feature-collapsible:hidden",
																)}
															/>
														</SidebarMenuSubButton>
													</CollapsibleTrigger>
													<CollapsibleContent>
														<SidebarMenuSub>
															{feature.rules?.map((rule, ruleIdx) => (
																<SidebarMenuSubItem key={ruleIdx}>
																	<SidebarMenuSubButton
																		isActive={isRuleSelected(
																			selected,
																			featurePath,
																			ruleIdx,
																		)}
																		onClick={() =>
																			onSelect({
																				type: "rule",
																				path: featurePath,
																				ruleIndex: ruleIdx,
																			})
																		}
																	>
																		<ListChecks className="shrink-0" />
																		<span className="truncate">
																			{rule.name || rule.keyword}
																		</span>
																		{(rule.scenarios?.length ?? 0) > 0 && (
																			<Badge
																				variant="secondary"
																				className="ml-auto shrink-0 text-[10px] h-4 px-1.5"
																			>
																				{rule.scenarios?.length}
																			</Badge>
																		)}
																	</SidebarMenuSubButton>
																</SidebarMenuSubItem>
															))}
														</SidebarMenuSub>
													</CollapsibleContent>
												</SidebarMenuSubItem>
											</Collapsible>
										);
									})}
								</SidebarMenuSub>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>
				);
			})}
		</>
	);
}

// ---------------------------------------------------------------------------
// AppSidebar
// ---------------------------------------------------------------------------

export const AppSidebar = ({
	folders,
	selected,
	onSelect,
}: AppSidebarProps) => {
	const [openKeys, setOpenKeys] = useState<Record<string, boolean>>(() => {
		// Open the first top-level folder by default
		const init: Record<string, boolean> = {};
		if (folders.length > 0) init["0"] = true;
		return init;
	});

	const toggleKey = (key: string) => {
		setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const totalFeatures = countFeaturesInFolders(folders);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							className="pointer-events-none"
							tooltip="Features"
						>
							<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
								<Layers className="size-4" />
							</div>
							<div className="flex flex-col gap-0.5 leading-none">
								<span className="font-semibold text-sm">Features</span>
								<span className="text-xs text-muted-foreground">
									{totalFeatures} file{totalFeatures !== 1 ? "s" : ""}
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="flex items-center gap-1.5">
						<BookOpen className="size-3.5" />
						Feature Files
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<FolderTree
								folders={folders}
								folderPath={[]}
								selected={selected}
								onSelect={onSelect}
								openKeys={openKeys}
								toggleKey={toggleKey}
							/>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarRail />
		</Sidebar>
	);
};

function countFeaturesInFolders(folders: FolderNode[]): number {
	return folders.reduce((sum, folder) => {
		return (
			sum +
			(folder.features?.length ?? 0) +
			countFeaturesInFolders(folder.folders ?? [])
		);
	}, 0);
}
