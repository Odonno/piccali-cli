import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { metadataAtom } from "@/atoms/state";

export const useDocumentTitle = () => {
	const metadata = useAtomValue(metadataAtom);

	useEffect(() => {
		if (metadata?.title) {
			document.title = metadata.title;
		}
	}, [metadata]);
};
