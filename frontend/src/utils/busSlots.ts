/**
 * A row with no registered RFID gate is treated as a bikes & cars only lane
 * (see useGateRows). Some of those rows can still have specific slot ranges
 * opened up for bus parking without wiring up a gate sensor for the whole
 * row — add the row here with its slot range to allow that. Every slot
 * outside the listed range stays reserved for bikes & cars as before.
 */
const EXTRA_BUS_SLOTS: Record<string, { from: number; to: number }> = {
  B: { from: 4, to: 12 },
  C: { from: 4, to: 12 },
};

/** True if a bus may park in this slot: either its row has a gate, or the
 * slot number falls inside that row's extra bus-parking range above. */
export function isBusParkable(row: string, slotNumber: number, isGateRow: boolean): boolean {
  if (isGateRow) return true;
  const range = EXTRA_BUS_SLOTS[row.toUpperCase()];
  return !!range && slotNumber >= range.from && slotNumber <= range.to;
}

/** True if a non-gate row still has part of it opened up for bus parking. */
export function hasBusException(row: string): boolean {
  return !!EXTRA_BUS_SLOTS[row.toUpperCase()];
}

/** "4–12" style label for the open slot range in a row, or null if none. */
export function busExceptionRangeLabel(row: string): string | null {
  const range = EXTRA_BUS_SLOTS[row.toUpperCase()];
  if (!range) return null;
  return `${range.from}\u2013${range.to}`;
}
