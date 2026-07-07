"use client";

import { useState } from "react";
import { Popover } from "../../analitica/components/Popover";

export interface PillOption {
  value: string;
  label: string;
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" stroke="var(--gray-11, #636363)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Dropdown pill — reuses the Analytics `btn-surface` trigger, `Popover` portal
 * and `menu-panel`/`menu-item` styles. Same primitive as the Analytics filter
 * bar; only the option set differs.
 */
export function Pill({
  options,
  value,
  onChange,
  minWidth = 180,
}: {
  options: PillOption[];
  value: string;
  onChange?: (value: string) => void;
  minWidth?: number;
}) {
  const [selected, setSelected] = useState(value);
  const current = options.find((o) => o.value === selected) ?? options[0];

  return (
    <Popover
      trigger={({ open, toggle }) => (
        <button type="button" className="btn-surface" onClick={toggle} aria-expanded={open}>
          {current?.label}
          <Chevron />
        </button>
      )}
    >
      {(close) => (
        <div className="menu-panel" style={{ minWidth: `${minWidth}px` }}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className="menu-item"
              data-active={o.value === selected}
              onClick={() => {
                setSelected(o.value);
                onChange?.(o.value);
                close();
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
