import type { FC, SVGProps } from "react";

/**
 * Inline SVG icons — no icon dependency, and nothing that has to load before the
 * page is usable.
 *
 * Every icon here is decorative: it sits beside text that already says the same
 * thing, so `aria-hidden` is baked in and none of them take a title. Size and
 * colour come from the caller (`size-*`, `text-*`); `currentColor` means an icon
 * always matches the text it's paired with.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

const Stroke: FC<IconProps & { d: string }> = ({ d, ...props }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d={d} />
  </svg>
);

export const CheckIcon: FC<IconProps> = (props) => (
  <Stroke d="M4 10.5 8 14.5 16 6" strokeWidth={2.2} {...props} />
);

export const ArrowLeftIcon: FC<IconProps> = (props) => (
  <Stroke d="M15.5 10H4.5m0 0 4.5-4.5M4.5 10 9 14.5" {...props} />
);

export const ArrowRightIcon: FC<IconProps> = (props) => (
  <Stroke d="M4.5 10h11m0 0L11 5.5M15.5 10 11 14.5" {...props} />
);

export const ShieldIcon: FC<IconProps> = (props) => (
  <Stroke
    d="M10 2.75 4.25 4.9v4.35c0 3.2 2.3 6.1 5.75 7.5 3.45-1.4 5.75-4.3 5.75-7.5V4.9L10 2.75Z"
    {...props}
  />
);

export const AlertIcon: FC<IconProps> = (props) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <circle cx="10" cy="10" r="7.25" />
    <path d="M10 6.25v4.5" />
    <circle cx="10" cy="13.75" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

/** 書類・申請系。給付金請求カードなどに。 */
export const DocumentIcon: FC<IconProps> = (props) => (
  <Stroke
    d="M5.5 2.75h6L15 6.25v11a.75.75 0 0 1-.75.75H5.5a.75.75 0 0 1-.75-.75V3.5a.75.75 0 0 1 .75-.75Zm5.5 0V6.25H15M7.5 10.5h5M7.5 13.5h5"
    {...props}
  />
);

/** 医療・健康系のハートビート。 */
export const HeartPulseIcon: FC<IconProps> = (props) => (
  <Stroke
    d="M10 16.5C5.5 13.5 3 11 3 8.25A3.25 3.25 0 0 1 10 6a3.25 3.25 0 0 1 7 2.25c0 .55-.1 1.07-.28 1.57M11.5 10h2l1-1.5 1.5 3 1-1.5h1.5"
    {...props}
  />
);

/** Indeterminate progress, for the moment between submit and response. */
export const SpinnerIcon: FC<IconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={`animate-spin motion-reduce:animate-none ${className ?? ""}`}
    {...props}
  >
    <circle
      cx="10"
      cy="10"
      r="7.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeOpacity="0.3"
    />
    <path
      d="M17.5 10A7.5 7.5 0 0 0 10 2.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
