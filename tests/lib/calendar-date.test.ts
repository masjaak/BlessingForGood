import { describe, expect, it } from "vitest";
import {
  BFG_TIME_ZONE,
  calendarDateInputValue,
  calendarDateToEndTimestamp,
  formatBfgCalendarDate,
} from "@/lib/calendar-date";

describe("BFG calendar date boundary", () => {
  it("uses the existing Asia/Jakarta date contract for date-only values", () => {
    const deadline = calendarDateToEndTimestamp("2030-08-30");

    expect(BFG_TIME_ZONE).toBe("Asia/Jakarta");
    expect(calendarDateInputValue(deadline)).toBe("2030-08-30");
    expect(formatBfgCalendarDate(deadline)).toBe("30 Agu 2030");
  });

  it("keeps the selected date through its Jakarta day boundary", () => {
    expect(calendarDateToEndTimestamp("2030-08-30")).toBe(Date.parse("2030-08-30T23:59:59.999+07:00"));
  });
});
