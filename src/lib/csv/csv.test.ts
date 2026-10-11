import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "./index";

describe("CSV export", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(escapeCsvCell("+91 phone")).toBe("'+91 phone");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("-cmd")).toBe("'-cmd");
  });

  it("keeps plain numbers numeric, including negatives", () => {
    expect(escapeCsvCell("-1250.50")).toBe("-1250.50");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("quotes commas, quotes and newlines; blanks for null", () => {
    expect(escapeCsvCell("a,b")).toBe("\"a,b\"");
    expect(escapeCsvCell("say \"hi\"")).toBe("\"say \"\"hi\"\"\"");
    expect(escapeCsvCell(null)).toBe("");
    expect(toCsv(["A", "B"], [["1", null]])).toBe("A,B\r\n1,\r\n");
  });
});
