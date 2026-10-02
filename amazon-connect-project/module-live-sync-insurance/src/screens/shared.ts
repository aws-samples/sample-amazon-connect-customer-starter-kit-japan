/**
 * The few class strings every page uses, and the rules of thumb behind them.
 * Anything only one page needs stays in that page's file.
 *
 * Styling is Tailwind utilities plus the primitives in `styles.css` (`.btn`,
 * `.input`, `.field-*`, `.facts`).
 *
 * Responsive rules of thumb applied across the pages:
 * - One column on a phone, two from `sm` up, and never a third: these are reading
 *   and answering screens, not a dashboard.
 * - Fact grids use `auto-fit`/`minmax` rather than breakpoints, because they sit
 *   inside cards whose width has little to do with the viewport's.
 * - Anything tappable clears 44px (`.btn` carries `min-h-11`), and full-width
 *   buttons on a phone collapse to their natural width from `sm` up.
 */

export const heading2 =
  "text-xl font-bold tracking-tight text-balance text-ink sm:text-2xl";
export const lead = "mt-1.5 text-ink-soft";
export const alertBox =
  "rounded-lg border border-danger-line bg-danger-soft px-4 py-3.5 text-danger";
/** Term-over-value pairs that reflow on their own, inside a card or the panel. */
export const factsGrid =
  "facts grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-x-4 gap-y-3";
export const panelBox = "rounded-panel border border-line p-4 sm:p-5";
/** Primary action first, stacked on a phone, in a row from `sm` up. */
export const actionRow =
  "flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center";
export const blockOnMobile = "w-full sm:w-auto";
