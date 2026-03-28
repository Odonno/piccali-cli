import { useContext } from "react";
import { DataContext, type DataContextValue } from "@/context/DataContext";

export const useDataContext = (): DataContextValue => {
	const ctx = useContext(DataContext);
	if (ctx === null) {
		throw new Error("useDataContext must be used within a DataContextProvider");
	}

	return ctx;
};
