import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/LoadingState";
import { AppSidebar, type SelectedFeature } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useDataContext } from "@/hooks/useDataContext";
import {
  FileText,
  BookOpen,
  Tag,
  Layers,
  ListChecks,
  AlertCircle,
} from "lucide-react";
import type { Feature, Rule } from "@/lib/types";

// Placeholder content for the selected feature/rule
function FeatureContent({
  feature,
  rule,
}: {
  feature: Feature;
  rule?: Rule;
}) {
  const subject = rule ?? feature;
  const scenarios = subject.scenarios ?? [];
  const background = subject.background;
  const tags = subject.tags ?? [];

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
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 text-xs font-mono"
              >
                <Tag className="size-3" />
                {tag}
              </Badge>
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
          <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col gap-1.5">
            {background.steps.map((step, i) => (
              <div key={i} className="flex items-baseline gap-2 text-sm">
                <span className="font-mono font-semibold text-primary min-w-[3.5rem] text-right shrink-0">
                  {step.keyword.trim()}
                </span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Scenarios placeholder list */}
      {scenarios.length > 0 && (
        <div className="flex flex-col gap-3">
          {scenarios.map((scenario, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-4 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest shrink-0 pt-0.5">
                  {scenario.keyword}
                </span>
                <span className="text-sm font-semibold leading-snug">
                  {scenario.name}
                </span>
                {(scenario.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {scenario.tags?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] gap-0.5 font-mono h-4 px-1"
                      >
                        <Tag className="size-2.5" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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

  if (isLoading) {
    return <LoadingState />;
  }

  const features = data?.features ?? [];

  // Resolve what's being viewed
  let selectedFeature: Feature | undefined;
  let selectedRule: Rule | undefined;

  if (selected !== null) {
    selectedFeature = features[selected.featureIndex];
    if (selected.type === "rule" && selectedFeature) {
      selectedRule = selectedFeature.rules?.[selected.ruleIndex];
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          features={features}
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
