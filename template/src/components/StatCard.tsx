export const StatCard = ({
	icon,
	value,
	label,
	children,
}: {
	icon: React.ReactNode;
	value: number;
	label: string;
	children?: React.ReactNode;
}) => (
	<div className="flex flex-col gap-4 rounded-xl border bg-card px-5 py-5">
		<div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
			{icon}
		</div>
		<div className="min-w-0">
			<div className="text-3xl font-bold tabular-nums tracking-tight leading-none">
				{value}
			</div>
			<div className="mt-2">
				{children ?? <p className="text-sm text-muted-foreground">{label}</p>}
			</div>
		</div>
	</div>
);
