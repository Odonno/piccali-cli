import { FileText } from "lucide-react";

export const EmptySelection = () => (
	<div className="flex flex-col items-center justify-center gap-5 h-full text-muted-foreground py-20">
		<div className="size-16 rounded-2xl bg-muted/60 border flex items-center justify-center">
			<FileText className="size-7 text-muted-foreground/50" />
		</div>
		<div className="flex flex-col items-center gap-1.5 max-w-xs text-center">
			<p className="text-sm font-semibold text-foreground">
				No feature selected
			</p>
			<p className="text-xs text-muted-foreground leading-relaxed">
				Choose a feature file from the sidebar to explore its scenarios and
				steps.
			</p>
		</div>
	</div>
);
