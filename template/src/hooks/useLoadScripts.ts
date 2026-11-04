import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { metadataAtom } from "@/atoms/state";

export const useLoadScripts = () => {
	const metadata = useAtomValue(metadataAtom);

	useEffect(() => {
		if (!metadata?.scripts?.length) {
			return;
		}

		const scripts = metadata.scripts.map((src) => {
			const script = document.createElement("script");
			script.src = src;
			document.head.appendChild(script);
			return script;
		});

		return () => {
			for (const script of scripts) {
				document.head.removeChild(script);
			}
		};
	}, [metadata?.scripts]);
};
