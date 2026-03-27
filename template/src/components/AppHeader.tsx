import { CalendarClock, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { PiccaliMetadata } from "@/lib/types";

type AppHeaderProps = {
  metadata: PiccaliMetadata;
};

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export const AppHeader = ({ metadata }: AppHeaderProps) => {
  return (
    <header className="flex items-center gap-2 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
      <SidebarTrigger className="-ml-1" />

      <Separator orientation="vertical" className="h-5 mx-1" />

      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Sparkles className="size-4 text-primary" />
        </div>
        <h1 className="text-base font-semibold tracking-tight truncate">
          {metadata.title}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <CalendarClock className="size-3.5" />
        <span>Generated {formatDate(metadata.createdAt)}</span>
      </div>
    </header>
  );
};
