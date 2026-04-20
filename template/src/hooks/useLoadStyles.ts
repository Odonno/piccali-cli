import { metadataAtom } from "@/atoms/state";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

export const useLoadStyles = () => {
	const metadata = useAtomValue(metadataAtom);

	useEffect(() => {
		if (!metadata?.styles?.length) {
			return;
		}

		const links = metadata.styles.map((href) => {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = href;
			document.head.appendChild(link);
			return link;
		});

		return () => {
			for (const link of links) {
				document.head.removeChild(link);
			}
		};
	}, [metadata?.styles]);
};
