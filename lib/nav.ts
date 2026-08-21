"use client";

/** Tiny cross-view navigation bus: navigate("matters", matterId) opens a view focused on a record. */
export function navigate(view: string, focusId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("lf-nav", { detail: { view, focusId } })
  );
}

export function onNavigate(cb: (view: string, focusId?: string) => void) {
  const h = (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    if (d.view) cb(d.view as string, d.focusId as string | undefined);
  };
  window.addEventListener("lf-nav", h);
  return () => window.removeEventListener("lf-nav", h);
}
