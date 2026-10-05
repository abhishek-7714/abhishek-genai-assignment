type P = { size?: number };

const I = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const HomeIcon = (p: P) => <I {...p} d="M3 8.2 9 3.5l6 4.7V15H3V8.2Z M7.2 15v-4h3.6v4" />;
export const InboxIcon = (p: P) => <I {...p} d="M2.5 10.5 4.6 4h8.8l2.1 6.5V14h-13v-3.5Z M2.5 10.5h4l1 1.6h3l1-1.6h4" />;
export const ClockIcon = (p: P) => <I {...p} d="M9 5v4l2.6 1.6 M15.5 9a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />;
export const ChartIcon = (p: P) => <I {...p} d="M3 15h12 M5 12V8 M9 12V4.5 M13 12V9.5" />;
export const SparkIcon = (p: P) => <I {...p} d="M9 2.5v3 M9 12.5v3 M2.5 9h3 M12.5 9h3 M4.6 4.6l2 2 M11.4 11.4l2 2 M4.6 13.4l2-2 M11.4 6.6l2-2" />;
export const MailIcon = (p: P) => <I {...p} d="M2.5 4.5h13v9h-13v-9Z M3 5l6 4.5L15 5" />;
export const GearIcon = (p: P) => (
  <I {...p} d="M9 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z M14.4 10.8l1.1.9-1.3 2.3-1.4-.5a5 5 0 0 1-1.5.9l-.2 1.4H8.5l-.2-1.4a5 5 0 0 1-1.5-.9l-1.4.5L4 11.7l1.1-.9a5 5 0 0 1 0-1.7L4 8.2l1.3-2.3 1.4.5a5 5 0 0 1 1.5-.9l.2-1.4h2.6l.2 1.4a5 5 0 0 1 1.5.9l1.4-.5 1.3 2.3-1.1.9a5 5 0 0 1 0 1.7Z" />
);
export const SearchIcon = (p: P) => <I {...p} d="M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M11.6 11.6 15 15" />;
export const ArrowLeft = (p: P) => <I {...p} d="M14 9H4 M8 5 4 9l4 4" />;
export const ArrowRight = (p: P) => <I {...p} d="M4 9h10 M10 5l4 4-4 4" />;
export const CheckIcon = (p: P) => <I {...p} d="M3.5 9.5 7 13l7.5-8" />;
export const RefreshIcon = (p: P) => <I {...p} d="M14.5 6.5A6 6 0 0 0 3.6 6 M3.5 11.5A6 6 0 0 0 14.4 12 M14.5 3v3.5H11 M3.5 15v-3.5H7" />;
export const MoreIcon = (p: P) => <I {...p} d="M4 9h.01 M9 9h.01 M14 9h.01" />;
