/** Legacy docs may omit `active`. Treat missing as visible. */
export function isEnabledFlag(value: boolean | undefined | null): boolean {
  return value !== false;
}

export function isVisibleRecord(item: {
  active?: boolean | null;
  archived?: boolean | null;
}): boolean {
  return isEnabledFlag(item.active) && item.archived !== true;
}
