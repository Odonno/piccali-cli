export const formatDate = (date: Date): string => {
	try {
		return date.toLocaleString("en-US", {
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return date.toISOString();
	}
};
