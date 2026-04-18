import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown } from './icons';
import { resolveSelectOptionVisualState } from './selectOptionState';
import { resolveSelectDropdownPlacement, SELECT_DROPDOWN_OFFSET } from './selectPlacement';
import styles from './Select.module.scss';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: ReadonlyArray<SelectOption>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  fullWidth?: boolean;
  id?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder,
  className,
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  fullWidth = true,
  id,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listboxId = `${selectId}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Recalculate fixed coordinates on open so the dropdown can escape overflow containers.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const placement = resolveSelectDropdownPlacement({
      triggerTop: rect.top,
      triggerBottom: rect.bottom,
      viewportHeight,
      optionCount: options.length,
    });

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: placement.maxHeight,
      ...(placement.direction === 'top'
        ? { bottom: viewportHeight - rect.top + SELECT_DROPDOWN_OFFSET, top: 'auto' }
        : { top: rect.bottom + SELECT_DROPDOWN_OFFSET, bottom: 'auto' }),
    });

    const handleScrollOrResize = () => setOpen(false);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open || disabled) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdownEl = document.getElementById(listboxId);
      if (
        !wrapRef.current?.contains(target) &&
        !dropdownEl?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [disabled, listboxId, open]);

  const isOpen = open && !disabled;
  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
  const resolvedHighlightedIndex =
    highlightedIndex >= 0 ? highlightedIndex : selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1;
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const displayText = selected?.label ?? placeholder ?? '';
  const isPlaceholder = !selected && placeholder;

  const commitSelection = useCallback(
    (nextIndex: number) => {
      const nextOption = options[nextIndex];
      if (!nextOption) return;
      onChange(nextOption.value);
      setOpen(false);
      setHighlightedIndex(nextIndex);
    },
    [onChange, options]
  );

  const moveHighlight = useCallback(
    (direction: 1 | -1) => {
      if (options.length === 0) return;
      const nextIndex = (resolvedHighlightedIndex + direction + options.length) % options.length;
      setHighlightedIndex(nextIndex);
    },
    [options.length, resolvedHighlightedIndex]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setOpen(true);
            return;
          }
          moveHighlight(1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            setOpen(true);
            return;
          }
          moveHighlight(-1);
          return;
        case 'Home':
          if (!isOpen || options.length === 0) return;
          event.preventDefault();
          setHighlightedIndex(0);
          return;
        case 'End':
          if (!isOpen || options.length === 0) return;
          event.preventDefault();
          setHighlightedIndex(options.length - 1);
          return;
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (!isOpen) {
            setOpen(true);
            return;
          }
          if (resolvedHighlightedIndex >= 0) {
            commitSelection(resolvedHighlightedIndex);
          }
          return;
        }
        case 'Escape':
          if (!isOpen) return;
          event.preventDefault();
          setOpen(false);
          return;
        case 'Tab':
          if (isOpen) setOpen(false);
          return;
        default:
          return;
      }
    },
    [commitSelection, disabled, isOpen, moveHighlight, options.length, resolvedHighlightedIndex]
  );

  return (
    <div
      className={`${styles.wrap} ${fullWidth ? styles.wrapFullWidth : ''} ${className ?? ''}`}
      ref={wrapRef}
    >
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        className={styles.trigger}
        onClick={disabled ? undefined : () => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && resolvedHighlightedIndex >= 0
            ? `${selectId}-option-${resolvedHighlightedIndex}`
            : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
      >
        <span className={`${styles.triggerText} ${isPlaceholder ? styles.placeholder : ''}`}>
          {displayText}
        </span>
        <span className={styles.triggerIcon} aria-hidden="true">
          <IconChevronDown size={14} />
        </span>
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className={styles.dropdown} id={listboxId} role="listbox" aria-label={ariaLabel} style={dropdownStyle}>
          {options.map((opt, index) => {
            const active = opt.value === value;
            const highlighted = index === resolvedHighlightedIndex;
            const optionState = resolveSelectOptionVisualState({ active, highlighted });
            const optionStateClassName =
              optionState === 'active'
                ? styles.optionActive
                : optionState === 'highlighted'
                  ? styles.optionHighlighted
                  : optionState === 'activeHighlighted'
                    ? styles.optionActiveHighlighted
                    : '';
            return (
              <button
                key={opt.value}
                id={`${selectId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.option} ${optionStateClassName}`.trim()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onKeyDown={handleKeyDown}
                onClick={() => commitSelection(index)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
