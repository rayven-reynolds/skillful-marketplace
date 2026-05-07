"use client";

import { useCallback, useMemo, useState } from "react";

export type AvailabilityBlock = {
  id: string;
  start_ts: string;
  end_ts: string;
};

type Props = {
  /** Blocks where the planner is UNAVAILABLE. */
  blocks: AvailabilityBlock[];
  /** Allow clicking to toggle dates (planner editing their own profile). */
  editable?: boolean;
  /** Called when a date is clicked in edit mode. */
  onToggle?: (dateStr: string, currentlyBusy: boolean, blockId: string | undefined) => void;
  /** Enable date selection mode (client picking an event date). */
  selectable?: boolean;
  /** Currently selected date in "YYYY-MM-DD" format. */
  selectedDate?: string;
  /** Called with the date string when a day is selected; also receives whether that date is busy. */
  onSelect?: (dateStr: string, isBusy: boolean) => void;
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Returns a Set<string> of "YYYY-MM-DD" strings that are busy. */
function busyDateSet(blocks: AvailabilityBlock[]): Map<string, string> {
  const map = new Map<string, string>(); // dateStr → block.id
  for (const b of blocks) {
    const start = new Date(b.start_ts);
    const end = new Date(b.end_ts);
    const cur = new Date(start);
    cur.setUTCHours(0, 0, 0, 0);
    while (cur < end) {
      map.set(toDateStr(cur), b.id);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return map;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function AvailabilityCalendar({
  blocks,
  editable = false,
  onToggle,
  selectable = false,
  selectedDate,
  onSelect,
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const busyMap = useMemo(() => busyDateSet(blocks), [blocks]);

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const cells: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(new Date(year, month, d));
    }
    return cells;
  }, [year, month]);

  const prev = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }, [month]);

  const next = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }, [month]);

  return (
    <div className="w-full max-w-sm select-none">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prev}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-zinc-800">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={next}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-px">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const str = toDateStr(d);
          const blockId = busyMap.get(str);
          const busy = blockId !== undefined;
          const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = selectable && selectedDate === str;

          function handleClick() {
            if (isPast) return;
            if (editable) onToggle?.(str, busy, blockId);
            if (selectable) onSelect?.(str, busy);
          }

          let cellCls = "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition";
          if (isPast) {
            cellCls += " text-zinc-300 cursor-default";
          } else if (isSelected) {
            cellCls += " bg-rose-600 text-white font-semibold ring-2 ring-rose-300 cursor-pointer";
          } else if (busy) {
            cellCls += " bg-zinc-200 text-zinc-500";
            if (editable || selectable) cellCls += " hover:bg-zinc-300 cursor-pointer";
          } else {
            cellCls += " bg-emerald-50 text-emerald-700 font-medium";
            if (editable || selectable) cellCls += " hover:bg-emerald-100 cursor-pointer";
          }

          return (
            <button
              key={str}
              type="button"
              disabled={!editable && !selectable || isPast}
              onClick={handleClick}
              title={isSelected ? "Selected" : busy ? "Unavailable" : "Available"}
              className={cellCls}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-100 ring-1 ring-emerald-300" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-zinc-200 ring-1 ring-zinc-300" />
          Unavailable
        </span>
        {selectedDate && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500 ring-1 ring-rose-300" />
            Selected
          </span>
        )}
        {editable && (
          <span className="ml-auto italic text-zinc-400">Click to toggle</span>
        )}
        {selectable && !editable && (
          <span className="ml-auto italic text-zinc-400">Click to pick a date</span>
        )}
      </div>
    </div>
  );
}
