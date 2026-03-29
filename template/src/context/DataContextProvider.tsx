import { useEffect, useState, type ReactNode } from "react";
import type { PiccaliData, PiccaliMetadata } from "@/types/data";
import { DataContext } from "@/context/DataContext";

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
	const [data, setData] = useState<PiccaliData | null>(null);
	const [metadata, setMetadata] = useState<PiccaliMetadata | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		const fetchAll = async () => {
			try {
				const [dataRes, metadataRes] = await Promise.all([
					fetch("/data.json"),
					fetch("/metadata.json"),
				]);

				const [dataJson, metadataJson] = await Promise.all([
					dataRes.json() as Promise<PiccaliData>,
					metadataRes.json() as Promise<PiccaliMetadata>,
				]);

				if (!cancelled) {
					setData(dataJson);
					setMetadata(metadataJson);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		void fetchAll();

		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<DataContext.Provider value={{ data, metadata, isLoading }}>
			{children}
		</DataContext.Provider>
	);
};
