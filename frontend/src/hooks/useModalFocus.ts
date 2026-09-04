import { useEffect, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

export interface ModalFocusOptions {
  isOpen: boolean;
  onDismiss: () => void;
  canDismiss?: boolean;
}

export function getWrappedFocusIndex(
  activeIndex: number,
  focusableCount: number,
  reverse: boolean
): number | null {
  if (focusableCount <= 0) return null;
  if (activeIndex < 0) return reverse ? focusableCount - 1 : 0;
  if (reverse && activeIndex === 0) return focusableCount - 1;
  if (!reverse && activeIndex === focusableCount - 1) return 0;
  return null;
}

export const useModalFocus = ({
  isOpen,
  onDismiss,
  canDismiss = true,
}: ModalFocusOptions) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);
  const canDismissRef = useRef(canDismiss);

  onDismissRef.current = onDismiss;
  canDismissRef.current = canDismiss;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const initialFocusTarget = dialog.querySelector<HTMLElement>(focusableSelector) ?? dialog;
    initialFocusTarget.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canDismissRef.current) {
        event.preventDefault();
        onDismissRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector)
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const activeIndex = focusableElements.findIndex(
        (element) => element === document.activeElement
      );
      const targetIndex = getWrappedFocusIndex(
        activeIndex,
        focusableElements.length,
        event.shiftKey
      );
      if (targetIndex === null) return;

      event.preventDefault();
      focusableElements[targetIndex].focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen]);

  return dialogRef;
};
