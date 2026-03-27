import { useState } from "react";
import {
  FileText,
  ChevronRight,
  Layers,
  BookOpen,
  ListChecks,
  Tag as TagIcon,
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
import type { Feature } from "@/lib/types";

export type SelectedFeature =
  | { type: "feature"; featureIndex: number }
  | { type: "rule"; featureIndex: number; ruleIndex: number };

type AppSidebarProps = {
  features: Feature[];
  selected: SelectedFeature | null;
  onSelect: (selection: SelectedFeature) => void;
};

function scenarioCount(feature: Feature): number {
  const direct = feature.scenarios?.length ?? 0;
  const fromRules =
    feature.rules?.reduce((sum, r) => sum + (r.scenarios?.length ?? 0), 0) ??
    0;
  return direct + fromRules;
}

function featureLabel(feature: Feature): string {
  return feature.name || feature.keyword;
}

export const AppSidebar = ({
  features,
  selected,
  onSelect,
}: AppSidebarProps) => {
  const [openFeatures, setOpenFeatures] = useState<Record<number, boolean>>(
    () => {
      // Open the first feature by default
      if (features.length > 0) return { 0: true } as Record<number, boolean>;
      return {} as Record<number, boolean>;
    }
  );

  const toggleFeature = (idx: number) => {
    setOpenFeatures((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const isFeatureSelected = (featureIndex: number) =>
    selected?.type === "feature" && selected.featureIndex === featureIndex;

  const isRuleSelected = (featureIndex: number, ruleIndex: number) =>
    selected?.type === "rule" &&
    selected.featureIndex === featureIndex &&
    selected.ruleIndex === ruleIndex;

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
                  {features.length} file{features.length !== 1 ? "s" : ""}
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
              {features.map((feature, featureIdx) => {
                const hasRules = (feature.rules?.length ?? 0) > 0;
                const count = scenarioCount(feature);
                const isOpen = openFeatures[featureIdx] ?? false;
                const isActive = isFeatureSelected(featureIdx);

                if (!hasRules) {
                  // Simple feature with no rules — flat item
                  return (
                    <SidebarMenuItem key={featureIdx}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() =>
                              onSelect({
                                type: "feature",
                                featureIndex: featureIdx,
                              })
                            }
                            tooltip={featureLabel(feature)}
                          >
                            <FileText className="shrink-0" />
                            <span className="truncate">{featureLabel(feature)}</span>
                            {count > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-auto shrink-0 text-[10px] h-4 px-1.5"
                              >
                                {count}
                              </Badge>
                            )}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">{featureLabel(feature)}</p>
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
                    </SidebarMenuItem>
                  );
                }

                // Feature with rules — collapsible tree
                return (
                  <Collapsible
                    key={featureIdx}
                    open={isOpen}
                    onOpenChange={() => toggleFeature(featureIdx)}
                    className="group/collapsible"
                    asChild
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() =>
                            onSelect({
                              type: "feature",
                              featureIndex: featureIdx,
                            })
                          }
                          tooltip={featureLabel(feature)}
                        >
                          <FileText className="shrink-0" />
                          <span className="truncate">{featureLabel(feature)}</span>
                          {count > 0 && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "ml-auto shrink-0 text-[10px] h-4 px-1.5",
                                "group-data-[state=open]/collapsible:hidden"
                              )}
                            >
                              {count}
                            </Badge>
                          )}
                          <ChevronRight
                            className={cn(
                              "ml-auto size-3.5 shrink-0 transition-transform duration-200",
                              "group-data-[state=open]/collapsible:rotate-90",
                              count > 0 &&
                                "group-data-[state=closed]/collapsible:hidden"
                            )}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {feature.rules?.map((rule, ruleIdx) => (
                            <SidebarMenuSubItem key={ruleIdx}>
                              <SidebarMenuSubButton
                                isActive={isRuleSelected(featureIdx, ruleIdx)}
                                onClick={() =>
                                  onSelect({
                                    type: "rule",
                                    featureIndex: featureIdx,
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
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};
