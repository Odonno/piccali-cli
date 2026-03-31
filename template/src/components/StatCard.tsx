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
	<div className="flex items-start gap-4 rounded-xl border bg-card px-5 py-4">
		<div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
			{icon}
		</div>
		<div className="min-w-0">
			<div className="text-2xl font-bold tabular-nums">{value}</div>
			{children ?? <p className="text-sm text-muted-foreground">{label}</p>}
		</div>
	</div>
);
