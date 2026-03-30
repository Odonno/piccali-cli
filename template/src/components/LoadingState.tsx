import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FileText, Layers } from "lucide-react";

export const LoadingState = () => {
	return (
		<div className="flex h-svh w-full overflow-hidden">
			{/* Sidebar skeleton */}
			<aside className="hidden md:flex flex-col w-64 border-r bg-sidebar shrink-0">
				{/* Sidebar header */}
				<div className="flex items-center gap-2 px-4 py-3 border-b">
					<Layers className="size-4 text-muted-foreground" />
					<Skeleton className="h-4 w-24" />
				</div>

				{/* Sidebar feature list skeleton */}
				<div className="flex flex-col gap-1 p-3 flex-1 overflow-hidden">
					<div className="px-2 py-1 mb-1">
						<Skeleton className="h-3 w-16" />
					</div>
					{Array.from({ length: 6 }).map((_, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: required
							key={index}
							className="flex items-center gap-2 px-2 py-1.5 rounded"
						>
							<FileText className="size-4 text-muted-foreground shrink-0" />
							<Skeleton
								className="h-3.5"
								style={{ width: `${55 + (index % 3) * 18}%` }}
							/>
						</div>
					))}
				</div>
			</aside>

			{/* Main content skeleton */}
			<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
				{/* Header skeleton */}
				<header className="flex items-center gap-4 px-6 py-4 border-b shrink-0">
					<Skeleton className="h-7 w-48" />
					<Separator orientation="vertical" className="h-5" />
					<Skeleton className="h-4 w-56" />
				</header>

				{/* Content skeleton */}
				<main className="flex-1 overflow-auto p-6">
					<div className="max-w-3xl mx-auto flex flex-col gap-6">
						{/* Empty state indicator */}
						<div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
							<div className="relative">
								<div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
									<Layers className="size-8 text-muted-foreground/50" />
								</div>
								{/* Animated pulse ring */}
								<span className="absolute inset-0 rounded-2xl animate-ping bg-primary/10" />
							</div>
							<div className="flex flex-col items-center gap-1.5">
								<p className="text-sm font-medium text-foreground">
									Loading features...
								</p>
								<p className="text-xs text-muted-foreground">
									Parsing Gherkin feature files
								</p>
							</div>
							<div className="flex gap-1.5 mt-2">
								{Array.from({ length: 3 }).map((_, index) => (
									<span
										// biome-ignore lint/suspicious/noArrayIndexKey: required
										key={index}
										className="size-1.5 rounded-full bg-primary/40 animate-bounce"
										style={{ animationDelay: `${index * 150}ms` }}
									/>
								))}
							</div>
						</div>

						{/* Skeleton cards below */}
						{Array.from({ length: 3 }).map((_, index) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: required
								key={index}
								className="rounded-lg border bg-card p-5 flex flex-col gap-3"
							>
								<div className="flex items-center gap-2">
									<Skeleton className="size-4 rounded" />
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-4 w-12 ml-auto rounded-full" />
								</div>
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-3 w-4/5" />
								<div className="flex gap-2 mt-1">
									<Skeleton className="h-5 w-16 rounded-full" />
									<Skeleton className="h-5 w-20 rounded-full" />
								</div>
							</div>
						))}
					</div>
				</main>
			</div>
		</div>
	);
};
