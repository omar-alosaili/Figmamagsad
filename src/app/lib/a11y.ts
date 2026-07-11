import type { KeyboardEvent } from "react";

// Makes a non-<button> element (a clickable card/row) operable by keyboard
// and announced as a control by screen readers — the fix for the many
// `<div onClick>` navigation targets. Spread onto the element:
//   <div {...tappable(() => onPlaceClick(id), place.name)} className="...">
// The onKeyDown guard ignores events bubbling up from nested controls
// (e.g. a save button inside the card), so Enter/Space on those doesn't
// also trigger the card.
export function tappable(onClick: () => void, label?: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    ...(label ? { "aria-label": label } : {}),
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
}
