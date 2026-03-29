import {
	FileText,
	ChevronRight,
	ListChecks,
	Tag as TagIcon,
	Folder,
	FolderOpen,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
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
import type { FolderNode } from "@/types/data";
import type { FeaturePath } from "@/types/navigation";
import {
	featureScenarioCount,
	folderTotalScenarioCount,
	featureLabel,
	folderKey,
	buildFeatureUrl,
	buildRuleUrl,
} from "@/functions/feature";

type FolderTreeProps = {
	/** The current level's folders to render. */
	folders: FolderNode[];
	/** Root-level folders — used for URL building (paths are absolute from root). */
	rootFolders: FolderNode[];
	folderPath: number[];
	openKeys: Record<string, boolean>;
	toggleKey: (key: string) => void;
	depth?: number;
};

export const FolderTree = ({
	folders,
	rootFolders,
	folderPath,
	openKeys,
	toggleKey,
	depth = 0,
}: FolderTreeProps) => {
	const location = useRouterState({ select: (s) => s.location.pathname });

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
												rootFolders={rootFolders}
												folderPath={currentPath}
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
										const featureUrl = buildFeatureUrl(
											rootFolders,
											featurePath,
										);
										const hasRules = (feature.rules?.length ?? 0) > 0;
										const featureCount = featureScenarioCount(feature);
										const featureIsActive =
											location === featureUrl ||
											location.startsWith(`${featureUrl}/`);
										const featureItemKey = `${key}.f${featureIdx}`;
										const isFeatureOpen = openKeys[featureItemKey] ?? false;

										if (!hasRules) {
											return (
												<SidebarMenuSubItem key={featureUrl}>
													<Tooltip>
														<TooltipTrigger asChild>
															<SidebarMenuSubButton
																isActive={featureIsActive}
																asChild
															>
																<Link to={featureUrl}>
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
																</Link>
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
												key={featureUrl}
												open={isFeatureOpen}
												onOpenChange={() => toggleKey(featureItemKey)}
												className="group/feature-collapsible"
												asChild
											>
												<SidebarMenuSubItem>
													<CollapsibleTrigger asChild>
														<SidebarMenuSubButton
															isActive={featureIsActive}
															asChild
														>
															<Link to={featureUrl}>
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
															</Link>
														</SidebarMenuSubButton>
													</CollapsibleTrigger>
													<CollapsibleContent>
														<SidebarMenuSub>
															{feature.rules?.map((rule) => {
																const ruleUrl = buildRuleUrl(
																	rootFolders,
																	featurePath,
																	rule,
																);
																const ruleIsActive = location === ruleUrl;
																return (
																	<SidebarMenuSubItem key={ruleUrl}>
																		<SidebarMenuSubButton
																			isActive={ruleIsActive}
																			asChild
																		>
																			<Link to={ruleUrl}>
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
																			</Link>
																		</SidebarMenuSubButton>
																	</SidebarMenuSubItem>
																);
															})}
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
};
