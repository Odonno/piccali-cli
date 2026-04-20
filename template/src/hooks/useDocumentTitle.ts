import { metadataAtom } from "@/atoms/state";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

export const useDocumentTitle = () => {
	const metadata = useAtomValue(metadataAtom);

	useEffect(() => {
		if (metadata?.title) {
			document.title = metadata.title;
		}
	}, [metadata]);
};
