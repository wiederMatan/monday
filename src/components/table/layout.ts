/** Fixed table geometry, in px. Column widths are CSS variables set on the table root. */
export const GUTTER = 36;
export const STRIP = 6;
export const CHECK = 38;
export const ADD_COLUMN = 48;
export const DEFAULT_NAME_WIDTH = 380;

export const NAME_WIDTH_VAR = "--name-w";

export function columnWidthVar(columnId: string): string {
  return `--cw-${columnId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function columnWidth(columnId: string): string {
  return `var(${columnWidthVar(columnId)})`;
}
