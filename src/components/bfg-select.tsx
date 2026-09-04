"use client";

import { createPortal } from "react-dom";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode };

type BFGOption = {
  key: string;
  value: string;
  label: ReactNode;
  disabled: boolean;
};

export type BFGSelectChangeEvent = { target: { name?: string; value: string } };

export type BFGSelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "defaultValue" | "disabled" | "onChange" | "value"
> & {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (event: BFGSelectChangeEvent) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchInputLabel?: string;
  searchEmptyMessage?: ReactNode;
  selectedLabel?: ReactNode;
};

function nextEnabled(options: BFGOption[], start: number, direction: 1 | -1) {
  for (let index = start; index >= 0 && index < options.length; index += direction) {
    if (!options[index].disabled) return index;
  }
  return -1;
}

export function BFGSelect({
  children,
  value,
  defaultValue,
  onChange,
  name,
  required,
  id,
  className = "",
  disabled = false,
  searchable = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cari…",
  searchInputLabel,
  searchEmptyMessage = "Tidak ada pilihan.",
  selectedLabel,
  ...buttonProps
}: BFGSelectProps) {
  const generatedId = useId();
  const triggerId = id || `bfg-select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;
  const options = useMemo(
    () =>
      Children.toArray(children).flatMap((child, index): BFGOption[] => {
        if (!isValidElement<OptionProps>(child) || child.type !== "option") return [];
        const optionValue = String(child.props.value ?? child.props.children ?? "");
        return [
          {
            key: child.key ? String(child.key) : `${optionValue}-${index}`,
            value: optionValue,
            label: child.props.children ?? optionValue,
            disabled: Boolean(child.props.disabled),
          },
        ];
      }),
    [children],
  );
  const firstValue = options.find((option) => !option.disabled)?.value || "";
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstValue);
  const selectedValue = value ?? internalValue;
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const selectedOption = options[selectedIndex];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : nextEnabled(options, 0, 1));
  const [internalSearch, setInternalSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchQuery = searchValue ?? internalSearch;
  const activeOptionIndex =
    activeIndex >= 0 && activeIndex < options.length && !options[activeIndex].disabled
      ? activeIndex
      : nextEnabled(options, 0, 1);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabled(options, 0, 1));
    if (searchValue === undefined) setInternalSearch("");
    onSearchChange?.("");
    triggerRef.current?.focus();
  }, [onSearchChange, options, searchValue, selectedIndex]);

  function choose(option: BFGOption) {
    if (option.disabled) return;
    setInternalValue(option.value);
    onChange?.({ target: { name, value: option.value } });
    close();
  }

  function openMenu() {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabled(options, 0, 1));
    setOpen(true);
  }

  function updateSearch(value: string) {
    if (searchValue === undefined) setInternalSearch(value);
    onSearchChange?.(value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "Tab") {
      if (open) {
        setOpen(false);
        if (searchValue === undefined) setInternalSearch("");
        onSearchChange?.("");
      }
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        close();
      }
      return;
    }
    if (!open && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeOptionIndex];
      if (option) choose(option);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = nextEnabled(options, activeOptionIndex + direction, direction);
      if (next >= 0) setActiveIndex(next);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next = event.key === "Home" ? nextEnabled(options, 0, 1) : nextEnabled(options, options.length - 1, -1);
      if (next >= 0) setActiveIndex(next);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const start = event.key === "ArrowDown" ? 0 : options.length - 1;
      const next = nextEnabled(options, start, direction);
      if (next >= 0) setActiveIndex(next);
      triggerRef.current?.focus();
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
      const desiredHeight = renderedHeight || Math.min(160, Math.max(80, Math.max(above, below)));
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
    if (!open || activeOptionIndex < 0) return;
    optionRefs.current[activeOptionIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeOptionIndex, open]);

  useEffect(() => {
    if (!open || !searchable || !menuPosition) return;
    searchInputRef.current?.focus();
  }, [menuPosition, open, searchable]);

  const menu =
    open && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            className="bfg-select-menu"
            role="listbox"
            aria-label={buttonProps["aria-label"] || undefined}
            aria-labelledby={buttonProps["aria-labelledby"] || undefined}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            {searchable ? (
              <input
                ref={searchInputRef}
                className="input bfg-select-search"
                type="search"
                aria-label={searchInputLabel || searchPlaceholder}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => updateSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            ) : null}
            {options.map((option, index) => (
              <div
                aria-disabled={option.disabled || undefined}
                aria-selected={option.value === selectedValue}
                className={`bfg-select-option${index === activeOptionIndex ? " is-active" : ""}${
                  option.value === selectedValue ? " is-selected" : ""
                }`}
                id={`${listboxId}-option-${index}`}
                key={option.key}
                onClick={() => choose(option)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => {
                  if (!option.disabled) setActiveIndex(index);
                }}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
              >
                <span>{option.label}</span>
                {option.value === selectedValue ? (
                  <span className="bfg-select-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </div>
            ))}
            {searchable && !options.length ? (
              <div className="bfg-select-empty" role="status">
                {searchEmptyMessage}
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        {...buttonProps}
        aria-activedescendant={open && activeOptionIndex >= 0 ? `${listboxId}-option-${activeOptionIndex}` : undefined}
        aria-controls={listboxId}
        aria-disabled={disabled || undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required={required || undefined}
        className={`select bfg-select-trigger ${className}`.trim()}
        data-state={open ? "open" : "closed"}
        disabled={disabled}
        id={triggerId}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className="bfg-select-value">{selectedOption?.label ?? selectedLabel ?? selectedValue}</span>
        <span className="bfg-select-trailing" aria-hidden="true">
          <span className="bfg-select-chevron" />
        </span>
      </button>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      {menu}
    </>
  );
}
