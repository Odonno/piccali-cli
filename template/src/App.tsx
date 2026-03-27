import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type {
  Examples,
  Feature,
  FolderNode,
  Rule,
  Step,
  Tag,
} from "@/lib/types";

/**
 * Key for a selected example row: "examplesIndex-rowIndex".
 * Used to track which row is selected within a single Scenario Outline.
 */
type ExampleRowKey = `${number}-${number}`;

/** Cell value type categories for colour-coding. */
type CellType = "boolean" | "number" | "date" | "string";

/**
 * Detects the semantic type of a raw table cell string.
 *
 * - boolean  → "true" / "false" (case-insensitive)
 * - number   → anything parseable as a finite number (incl. decimals, negatives)
 * - date     → ISO 8601, DD/MM/YYYY, MM-DD-YYYY, common date-like patterns
 * - string   → everything else
 */
function classifyCell(value: string): CellType {
  const v = value.trim();
  if (v === "") return "string";

  // Boolean
  if (/^(true|false)$/i.test(v)) return "boolean";

  // Number — allow optional leading sign, digits, optional decimal, no trailing alpha
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return "number";

  // Date patterns:
  //   ISO 8601:          2024-01-31  or  2024-01-31T12:00:00Z
  //   DD/MM/YYYY:        31/01/2024
  //   MM/DD/YYYY:        01/31/2024
  //   DD-MM-YYYY:        31-01-2024
  //   Month name:        Jan 2024 | January 1st 2024
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}(T[\d::.Z+-]*)?$/, // ISO
    /^\d{2}[/-]\d{2}[/-]\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
    /^\d{1,2}\s+\w+\s+\d{4}$/, // 1 January 2024
    /^\w+\s+\d{1,2},?\s+\d{4}$/, // January 1, 2024
    /^\w{3}\s+\d{4}$/, // Jan 2024
  ];
  if (datePatterns.some((re) => re.test(v))) return "date";

  return "string";
}

/**
 * Renders a single table cell value with colour coding based on its type.
 *
 * - boolean → blue
 * - number  → green
 * - date    → yellow/amber
 * - string  → red (non-trivial values stand out; empty stays neutral)
 */
function TableCellValue({ value }: { value: string }) {
  const type = classifyCell(value);
  if (value.trim() === "") {
    return <span className="text-muted-foreground/50 italic">—</span>;
  }
  const styles: Record<CellType, string> = {
    boolean: "text-blue-600 dark:text-blue-400",
    number: "text-emerald-600 dark:text-emerald-400",
    date: "text-amber-600 dark:text-amber-400",
    string: "text-rose-600 dark:text-rose-400",
  };
  return <span className={styles[type]}>{value}</span>;
}

/**
 * Resolves the variable→value mapping from an Examples table row.
 * Returns null if exampleRowKey is null.
 */
function resolveExampleVars(
  examples: Examples[],
  exampleRowKey: ExampleRowKey | null,
): Record<string, string> | null {
  if (!exampleRowKey) return null;
  const [eiStr, riStr] = exampleRowKey.split("-");
  const ei = Number(eiStr);
  const ri = Number(riStr);
  const ex = examples[ei];
  if (!ex) return null;
  const vars: Record<string, string> = {};
  ex.table.header.forEach((col, ci) => {
    vars[col] = ex.table.rows[ri]?.[ci] ?? "";
  });
  return vars;
}

/**
 * Renders a step text string, replacing <variable> placeholders with
 * highlighted spans when vars are provided.
 */
function StepTextWithVars({
  text,
  vars,
}: {
  text: string;
  vars: Record<string, string> | null;
}) {
  if (!vars) return <span>{text}</span>;

  // Split on <varname> tokens
  const parts = text.split(/(<[^>]+>)/g);
  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^<([^>]+)>$/);
        if (match) {
          const varName = match[1];
          const value = vars[varName];
          if (value !== undefined) {
            return (
              <span
                key={i}
                className="rounded px-1 py-0.5 text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/60 font-semibold font-mono text-[0.8em]"
              >
                {value}
              </span>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

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
              <TableHead
                key={i}
                className="h-7 px-3 font-mono text-[11px] font-bold"
              >
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
                  <TableCellValue value={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Renders a list of steps with optional step tables and variable substitution. */
function StepList({
  steps,
  vars,
}: {
  steps: Step[];
  vars?: Record<string, string> | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, i) => (
        <div key={i}>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-mono font-semibold text-primary min-w-[3.5rem] text-right shrink-0">
              {step.keyword.trim()}
            </span>
            <StepTextWithVars text={step.text} vars={vars ?? null} />
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

  /**
   * Map of scenarioIndex → selected ExampleRowKey.
   * Tracks which example row is selected for each Scenario Outline.
   */
  const [selectedExampleRows, setSelectedExampleRows] = useState<
    Record<number, ExampleRowKey | null>
  >({});

  function toggleExampleRow(
    scenarioIndex: number,
    examplesIndex: number,
    rowIndex: number,
  ) {
    const key: ExampleRowKey = `${examplesIndex}-${rowIndex}`;
    setSelectedExampleRows((prev) => {
      const current = prev[scenarioIndex];
      return {
        ...prev,
        [scenarioIndex]: current === key ? null : key,
      };
    });
  }

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
          </div>

          {scenarios.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <AlertCircle className="size-8 opacity-40" />
              <p className="text-sm">No scenarios defined in this section.</p>
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="flex flex-col gap-4">
              {scenarios.map((scenario, scenarioIndex) => {
                const isOutline = scenario.keyword === "Scenario Outline";
                const selectedKey = selectedExampleRows[scenarioIndex] ?? null;
                const exampleVars =
                  isOutline && scenario.examples
                    ? resolveExampleVars(scenario.examples, selectedKey)
                    : null;

                return (
                  <div
                    key={scenarioIndex}
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
                        <StepList steps={scenario.steps} vars={exampleVars} />
                      </div>
                    )}

                    {/* Examples (Scenario Outline) */}
                    {(scenario.examples?.length ?? 0) > 0 && (
                      <div className="flex flex-col gap-2 mt-1">
                        {scenario.examples?.map((ex, examplesIndex) => {
                          // Build a running row offset so "#" ids are
                          // sequential across multiple Examples blocks.
                          const priorRowCount =
                            scenario.examples
                              ?.slice(0, examplesIndex)
                              .reduce(
                                (acc, e) => acc + e.table.rows.length,
                                0,
                              ) ?? 0;

                          return (
                            <div
                              key={examplesIndex}
                              className="flex flex-col gap-1"
                            >
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
                                      {/* # column */}
                                      <TableHead className="h-7 w-8 px-3 font-mono text-[11px] font-bold text-center">
                                        #
                                      </TableHead>
                                      {/* Preview toggle column */}
                                      <TableHead className="h-7 px-3 font-mono text-[11px] font-bold">
                                        Preview
                                      </TableHead>
                                      {/* Data columns */}
                                      {ex.table.header.map((col, ci) => (
                                        <TableHead
                                          key={ci}
                                          className="h-7 px-3 font-mono text-[11px] font-bold"
                                        >
                                          {col}
                                        </TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {ex.table.rows.map((row, ri) => {
                                      const key: ExampleRowKey = `${examplesIndex}-${ri}`;
                                      const isSelected = selectedKey === key;
                                      return (
                                        <TableRow
                                          key={ri}
                                          data-selected={isSelected}
                                          className="data-[selected=true]:bg-violet-50 dark:data-[selected=true]:bg-violet-950/30"
                                        >
                                          {/* # id */}
                                          <TableCell className="py-1.5 px-3 font-mono text-[11px] text-center text-muted-foreground">
                                            {priorRowCount + ri + 1}
                                          </TableCell>
                                          {/* Preview toggle */}
                                          <TableCell className="py-1 px-3">
                                            <Button
                                              variant={
                                                isSelected
                                                  ? "default"
                                                  : "outline"
                                              }
                                              size="xs"
                                              aria-pressed={isSelected}
                                              onClick={() =>
                                                toggleExampleRow(
                                                  scenarioIndex,
                                                  examplesIndex,
                                                  ri,
                                                )
                                              }
                                              className={
                                                isSelected
                                                  ? "bg-violet-600 hover:bg-violet-700 text-white border-transparent"
                                                  : ""
                                              }
                                            >
                                              {isSelected
                                                ? "Selected"
                                                : "Select"}
                                            </Button>
                                          </TableCell>
                                          {/* Data cells */}
                                          {row.map((cell, ci) => (
                                            <TableCell
                                              key={ci}
                                              className="py-1.5 px-3 font-mono text-[11px]"
                                            >
                                              <TableCellValue value={cell} />
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
