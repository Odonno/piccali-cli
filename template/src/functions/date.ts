export const formatDate = (isoString: string): string => {
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
};
