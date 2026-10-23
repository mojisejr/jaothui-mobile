/** Shared Home/list/owned policy: preserve text size instead of squeezing cards. */
export function buffaloCardColumns(width: number, fontScale: number): 1 | 2 {
  return width < 375 || fontScale > 1.15 ? 1 : 2;
}

export function buffaloCardFooterHeight(fontScale: number) {
  return Math.ceil(44 * Math.max(1, fontScale));
}
