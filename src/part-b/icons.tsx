// 005: the buy box's inline icons. All are decorative (aria-hidden), and colour comes from `currentColor`.
// T5 tunes their shapes against the reference.

const hidden = { "aria-hidden": true, focusable: false } as const;

export function StarIcon() {
  return (
    <svg {...hidden} viewBox="0 0 14 14" width="14" height="14" fill="currentColor">
      <path d="M7 .6l1.9 4.1 4.5.5-3.3 3 .9 4.4L7 10.4l-4 2.2.9-4.4-3.3-3 4.5-.5z" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...hidden} viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.5 6.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon() {
  return (
    <svg {...hidden} viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="7" cy="7" r="6.2" />
      <path d="M4.2 7.2l1.9 1.9 3.7-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg {...hidden} viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg {...hidden} viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8h10" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...hidden} viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8h10M8 3v10" strokeLinecap="round" />
    </svg>
  );
}
