"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** `true` une fois dans le navigateur : pour le contenu qui n'a pas de sens au pré-rendu. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
