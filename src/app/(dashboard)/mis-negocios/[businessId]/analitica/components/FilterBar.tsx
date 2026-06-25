import type { FilterState } from "../types";

interface FilterBarProps {
  filter: FilterState;
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" stroke="var(--gray-11, #636363)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Top filter row — surface buttons reflecting the current FilterState.
 * Visual only for now; wire each button to real filtering later.
 */
export function FilterBar({ filter }: FilterBarProps) {
  const buttons = [filter.timeRange, filter.dateLabel, filter.comparisonPeriod, filter.granularity, filter.product];

  return (
    <div
      className="hide-scrollbar"
      style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}
    >
      {buttons.map((label) => (
        <button key={label} type="button" className="btn-surface">
          {label}
          <ChevronDown />
        </button>
      ))}
    </div>
  );
}
