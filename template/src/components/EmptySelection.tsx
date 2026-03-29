import { FileText } from "lucide-react";

export const EmptySelection = () => (
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
