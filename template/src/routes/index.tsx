import { createFileRoute } from "@tanstack/react-router";
import { EmptySelection } from "@/components/EmptySelection";

export const Route = createFileRoute("/")({
	component: () => (
		<div className="h-[calc(100svh-4rem)] flex items-center justify-center">
			<EmptySelection />
		</div>
	),
});
