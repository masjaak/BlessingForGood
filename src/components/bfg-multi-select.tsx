"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type BFGMultiSelectOption = {
  value: string;
  label: ReactNode;
};

export type BFGMultiSelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "defaultValue" | "onChange" | "value"
> & {
  defaultLabel: ReactNode;
  options: readonly BFGMultiSelectOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  selectedLabel?: ReactNode;
  emptyOptionsLabel?: ReactNode;
};

export function BFGMultiSelect({
  defaultLabel,
  options,
  value,
  onChange,
  selectedLabel,
  emptyOptionsLabel = "Tidak ada pilihan.",
  id,
  className = "",
  disabled = false,
  "aria-label": ariaLabel,
  ...buttonProps
}: BFGMultiSelectProps) {
  const generatedId = useId();
  const triggerId = id || `bfg-multi-select-${generatedId}`;
  const menuId = `${triggerId}-menu`;
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  function openMenu() {
    if (!disabled) setOpen(true);
  }

  function toggleOption(optionValue: string, checked: boolean) {
    onChange(checked ? [...value, optionValue] : value.filter((candidate) => candidate !== optionValue));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open && ["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function positionMenu() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 12;
      const gap = 6;
      const below = Math.max(0, window.innerHeight - rect.bottom - gap - margin);
      const above = Math.max(0, rect.top - gap - margin);
      const renderedHeight = menuRef.current?.getBoundingClientRect().height;
      const desiredHeight = renderedHeight || Math.min(320, Math.max(80, Math.max(above, below)));
      const placeAbove = below < desiredHeight && above > below;
      const available = placeAbove ? above : below;
      const maxHeight = Math.min(320, Math.max(80, available), window.innerHeight - margin * 2);
      const height = renderedHeight || maxHeight;
      const width = Math.min(rect.width, window.innerWidth - margin * 2);
      const nextPosition = {
        top: placeAbove
          ? Math.max(margin, rect.top - gap - height)
          : Math.min(rect.bottom + gap, window.innerHeight - margin - height),
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - margin - width),
        width,
        maxHeight,
      };
      setMenuPosition((current) => {
        if (
          current &&
          current.top === nextPosition.top &&
          current.left === nextPosition.left &&
          current.width === nextPosition.width &&
          current.maxHeight === nextPosition.maxHeight
        ) {
          return current;
        }
        return nextPosition;
      });
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, menuPosition, open]);

  useEffect(() => {
    if (!open || !menuPosition) return;
    menuRef.current?.querySelector<HTMLInputElement>("input[type='checkbox']")?.focus();
  }, [menuPosition, open]);

  const menu =
    open && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="bfg-select-menu bfg-multi-select-menu"
            role="dialog"
            aria-label={ariaLabel || "Pilihan"}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              minWidth: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            <button
              type="button"
              className={`bfg-multi-select-reset${value.length === 0 ? " is-selected" : ""}`}
              aria-pressed={value.length === 0}
              onClick={() => onChange([])}
            >
              {defaultLabel}
            </button>
            {options.length ? (
              options.map((option) => (
                <label
                  className={`bfg-multi-select-option${value.includes(option.value) ? " is-selected" : ""}`}
                  key={option.value}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    onChange={(event) => toggleOption(option.value, event.target.checked)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            ) : (
              <div className="bfg-select-empty" role="status">
                {emptyOptionsLabel}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        {...buttonProps}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={`select bfg-select-trigger bfg-multi-select-trigger ${className}`.trim()}
        data-state={open ? "open" : "closed"}
        disabled={disabled}
        id={triggerId}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span className="bfg-select-value">{value.length ? selectedLabel : defaultLabel}</span>
        <span className="bfg-select-trailing" aria-hidden="true">
          <span className="bfg-select-chevron" />
        </span>
      </button>
      {menu}
    </>
  );
}
