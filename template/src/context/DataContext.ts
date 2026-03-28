import { createContext } from "react";
import type { PiccaliData, PiccaliMetadata } from "@/lib/types";

export type DataContextValue = {
	data: PiccaliData | null;
	metadata: PiccaliMetadata | null;
	isLoading: boolean;
};

export const DataContext = createContext<DataContextValue | null>(null);
