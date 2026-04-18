import { atom } from "jotai";

export const sidebarOpenKeysAtom = atom<Record<string, boolean>>({ "0": true });
