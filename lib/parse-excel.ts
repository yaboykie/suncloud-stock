import * as XLSX from "xlsx";
import { StockEntry } from "@/types/stock";
import { MODEL_LOOKUP } from "./known-models";

interface ParseResult {
  entries: Record<string, StockEntry>;
  matched: string[];
  unmatched: string[];
}

// Normalize a column header for matching
function normalizeHeader(h: string): string {
  return String(h).trim().toLowerCase().replace(/\n/g, " ");
}

export function parseStockFile(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Find "Summary Table" sheet, fall back to first sheet
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes("summary")) ??
    wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: 0,
  });

  const entries: Record<string, StockEntry> = {};
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const row of rows) {
    // Find the MODEL column (could be "MODEL", "Model", etc.)
    let modelVal: string | undefined;
    let available = 0;
    let awaitingStorage = 0;
    let reserved = 0;
    let inbound = 0;
    let outbound = 0;

    for (const [key, val] of Object.entries(row)) {
      const h = normalizeHeader(key);
      if (h === "model") {
        modelVal = String(val).trim();
      } else if (h.includes("available") && h.includes("stock")) {
        available = Number(val) || 0;
      } else if (h.includes("awaiting")) {
        awaitingStorage = Number(val) || 0;
      } else if (h === "reserved") {
        reserved = Number(val) || 0;
      } else if (h === "inbound") {
        inbound = Number(val) || 0;
      } else if (h === "outbound") {
        outbound = Number(val) || 0;
      }
    }

    if (!modelVal) continue;

    // Match against known models (case-insensitive, trimmed)
    const normalized = modelVal.toUpperCase();
    const knownModel = MODEL_LOOKUP[normalized];

    if (knownModel) {
      entries[knownModel] = {
        model: knownModel,
        available,
        awaitingStorage,
        reserved,
        inbound,
        outbound,
      };
      matched.push(knownModel);
    } else {
      unmatched.push(modelVal);
    }
  }

  return { entries, matched, unmatched };
}
