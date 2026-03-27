import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/LoadingState";
import { AppSidebar, type SelectedFeature } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useDataContext } from "@/hooks/useDataContext";
import {
  FileText,
  BookOpen,
  Tag as TagIcon,
  Layers,
  ListChecks,
  AlertCircle,
} from "lucide-react";
import type { Feature, FolderNode, Rule, Step, Tag } from "@/lib/types";

/** Resolve a feature from the folder tree using a folderPath + featureIndex. */
function resolveFeature(
  folders: FolderNode[],
  folderPath: number[],
  featureIndex: number,
): Feature | undefined {
  let current = folders;
  for (const idx of folderPath) {
    const node = current[idx];
    if (!node) return undefined;
    current = node.folders ?? [];
  }
  // Walk again to get the leaf folder
  let leaf: FolderNode | undefined;
  let nodes = folders;
  for (const idx of folderPath) {
    leaf = nodes[idx];
    if (!leaf) return undefined;
    nodes = leaf.folders ?? [];
  }
  return leaf?.features?.[featureIndex];
}

/** Renders a single tag as a Badge, optionally wrapped in an <a> link. */
function TagBadge({ tag, small = false }: { tag: Tag; small?: boolean }) {
  const badge = (
    <Badge
      variant="secondary"
      className={
        small
          ? "text-[10px] gap-0.5 font-mono h-4 px-1"
          : "gap-1 text-xs font-mono"
      }
    >
      <TagIcon className={small ? "size-2.5" : "size-3"} />
      {tag.name}
    </Badge>
  );

  if (tag.url) {
    return (
      <a href={tag.url} target="_blank" rel="noopener noreferrer">
        {badge}
      </a>
    );
  }

  return badge;
}

/** Renders a step table (data table attached to a step). */
function StepTable({ step }: { step: Step }) {
  if (!step.table) return null;
  const { header, rows } = step.table;

  return (
    <div className="mt-2 ml-[3.5rem] overflow-x-auto rounded-md border text-xs">
      <Table>
        <TableHeader>
          <TableRow>
            {header.map((col, i) => (
              <TableHead key={i} className="h-7 px-3 font-mono text-[11px]">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow key={ri}>
              {row.map((cell, ci) => (
                <TableCell
                  key={ci}
                  className="py-1.5 px-3 font-mono text-[11px]"
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Renders a list of steps with optional step tables. */
function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, i) => (
        <div key={i}>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-mono font-semibold text-primary min-w-[3.5rem] text-right shrink-0">
              {step.keyword.trim()}
            </span>
            <span>{step.text}</span>
          </div>
          {step.table && <StepTable step={step} />}
        </div>
      ))}
    </div>
  );
}

// Placeholder content for the selected feature/rule
function FeatureContent({
  feature,
  rule,
  onSelectRule,
}: {
  feature: Feature;
  rule?: Rule;
  onSelectRule?: (ruleIndex: number) => void;
}) {
  const subject = rule ?? feature;
  const scenarios = subject.scenarios ?? [];
  const background = subject.background;
  const tags = subject.tags ?? [];

  // Feature with rules and no rule selected: show rules list
  const hasRules = !rule && (feature.rules?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Feature/Rule header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {rule ? (
            <ListChecks className="size-5 text-primary shrink-0" />
          ) : (
            <FileText className="size-5 text-primary shrink-0" />
          )}
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            {subject.keyword}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{subject.name}</h2>

        {subject.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {subject.description.trim()}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.map((tag) => (
              <TagBadge key={tag.name} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Background */}
      {background && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4 text-muted-foreground" />
            Background
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <StepList steps={background.steps} />
          </div>
        </div>
      )}

      {/* Rules list (feature with rules, no rule selected) */}
      {hasRules && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-muted-foreground" />
            Rules
          </div>
          <div className="flex flex-col gap-2">
            {feature.rules?.map((r, ruleIdx) => {
              const ruleScenarioCount = r.scenarios?.length ?? 0;
              return (
                <button
                  key={ruleIdx}
                  onClick={() => onSelectRule?.(ruleIdx)}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ListChecks className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1">
                    {r.name || r.keyword}
                  </span>
                  {ruleScenarioCount > 0 && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ruleScenarioCount} scenario
                      {ruleScenarioCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scenarios (only shown when not a rules-only feature, or when a rule is selected) */}
      {!hasRules && (
        <>
          {/* Scenarios count */}
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}
            </span>
            <Badge variant="outline" className="text-xs">
              {scenarios.length > 0 ? "Defined" : "No scenarios"}
            </Badge>
          </div>

          {scenarios.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <AlertCircle className="size-8 opacity-40" />
              <p className="text-sm">No scenarios defined in this section.</p>
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="flex flex-col gap-4">
              {scenarios.map((scenario, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card p-4 flex flex-col gap-3"
                >
                  {/* Scenario header */}
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest shrink-0 pt-0.5">
                      {scenario.keyword}
                    </span>
                    <span className="text-sm font-semibold leading-snug flex-1">
                      {scenario.name}
                    </span>
                    {(scenario.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-auto">
                        {scenario.tags?.map((tag) => (
                          <TagBadge key={tag.name} tag={tag} small />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scenario description */}
                  {scenario.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line pl-2 border-l-2 border-muted">
                      {scenario.description.trim()}
                    </p>
                  )}

                  {/* Scenario steps */}
                  {(scenario.steps?.length ?? 0) > 0 && (
                    <div className="rounded-md bg-muted/40 px-4 py-3">
                      <StepList steps={scenario.steps} />
                    </div>
                  )}

                  {/* Examples (Scenario Outline) */}
                  {(scenario.examples?.length ?? 0) > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {scenario.examples?.map((ex, ei) => (
                        <div key={ei} className="flex flex-col gap-1">
                          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                            {ex.keyword}
                            {ex.name ? `: ${ex.name}` : ""}
                          </span>
                          {(ex.tags ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ex.tags?.map((tag) => (
                                <TagBadge key={tag.name} tag={tag} small />
                              ))}
                            </div>
                          )}
                          <div className="overflow-x-auto rounded-md border text-xs">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {ex.table.header.map((col, ci) => (
                                    <TableHead
                                      key={ci}
                                      className="h-7 px-3 font-mono text-[11px]"
                                    >
                                      {col}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ex.table.rows.map((row, ri) => (
                                  <TableRow key={ri}>
                                    {row.map((cell, ci) => (
                                      <TableCell
                                        key={ci}
                                        className="py-1.5 px-3 font-mono text-[11px]"
                                      >
                                        {cell}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptySelection() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full text-muted-foreground">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
        <FileText className="size-8 opacity-40" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">
          Select a feature to view
        </p>
        <p className="text-xs">
          Choose a feature file from the sidebar to get started
        </p>
      </div>
    </div>
  );
}

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
  function handleSelectRule(ruleIndex: number) {
    if (!selected) return;
    setSelected({
      type: "rule",
      path: selected.path,
      ruleIndex,
    });
  }

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
            {metadata && <AppHeader metadata={metadata} />}

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
