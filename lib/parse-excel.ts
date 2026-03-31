import * as XLSX from "xlsx";
import { StockEntry } from "@/types/stock";
import { MODEL_LOOKUP, KNOWN_MODELS } from "./known-models";

// Build a secondary lookup that strips all spaces for fuzzy matching
const FUZZY_LOOKUP: Record<string, string> = {};
for (const m of KNOWN_MODELS) {
  FUZZY_LOOKUP[m.replace(/\s+/g, "").toUpperCase()] = m;
}

// Known aliases: Excel model name → PRICE_DATA model name
const ALIASES: Record<string, string> = {
  "PDU1-B+BASE-NEW VERSION": "PDU1-B+Base",
  "COMBINER BOX-300": "Combiner Box",
  "SDM120CTM-40MA/ESCT-TA16": "SDM630MCT-40mA / ESCT-TA16",
  "AI-W5.1-PDU1-B-BASE-SUPPORT EXPANSION": "AI-W5.1-PDU1-B +Base",
  "AI-W5.1-PDU3-B-BASE-SUPPORT EXPANSION": "PDU3-B+Base",
  "SE-G5.1-PRO-B": "SE-G5.1Pro-B",
  "SUN-10K-G02P1-AU-AM3": "SUN-10K-G02P1-AU-AM2",
};

interface ParseResult {
  entries: Record<string, StockEntry>;
  matched: string[];
  unmatched: string[];
}

function normalizeHeader(h: string): string {
  return String(h).trim().toLowerCase().replace(/\n/g, " ");
}

function matchModel(modelVal: string): string | undefined {
  const normalized = modelVal.toUpperCase();
  const aliased = ALIASES[normalized];
  return (
    MODEL_LOOKUP[normalized] ??
    FUZZY_LOOKUP[modelVal.replace(/\s+/g, "").toUpperCase()] ??
    (aliased ? MODEL_LOOKUP[aliased.toUpperCase()] : undefined)
  );
}

// Format 1: "Summary Table" sheet with MODEL, Available Stock columns
function parseSummaryTable(
  wb: XLSX.WorkBook,
  sheetName: string
): ParseResult {
  const sheet = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: 0,
  });

  const entries: Record<string, StockEntry> = {};
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const row of rows) {
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
    const knownModel = matchModel(modelVal);

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

// Format 2: Sydney Warehouse format — multiple sheets, "Product description"
// or model name in column B/C, "In stock" column, multiple rows per model
function parseWarehouseSheets(wb: XLSX.WorkBook): ParseResult {
  const entries: Record<string, StockEntry> = {};
  const matchedSet = new Set<string>();
  const unmatchedSet = new Set<string>();

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });

    // Find header row — look for "In stock" or "Product description"
    let modelCol = -1;
    let inStockCol = -1;
    let shippingCol = -1;
    let bookedCol = -1;
    let headerRow = -1;

    for (let r = 0; r < Math.min(5, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      let hasProductDesc = false;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] ?? "")
          .trim()
          .toLowerCase()
          .replace(/\n/g, " ");
        // Prefer "product description" over "model" — in some sheets
        // "Model" is a category column while "Product description" has
        // the actual model strings
        if (val === "product description") {
          modelCol = c;
          headerRow = r;
          hasProductDesc = true;
        } else if (val === "model" && !hasProductDesc) {
          modelCol = c;
          headerRow = r;
        }
        if (val === "in stock") inStockCol = c;
        if (val.includes("shipping")) shippingCol = c;
        if (val === "booked") bookedCol = c;
      }
    }

    // If no explicit model column, check if column B has model-like data
    if (modelCol === -1 && headerRow === -1) {
      // Try column 1 (B) — some sheets put model names there directly
      for (let r = 0; r < Math.min(5, rows.length); r++) {
        const val = String(rows[r]?.[1] ?? "").trim();
        if (val.match(/^(SUN-|AI-|RW-|BOS-|PDU|SE-|HVB|SDM|3U-)/i)) {
          modelCol = 1;
          headerRow = r - 1;
          break;
        }
      }
    }

    if (modelCol === -1) continue;

    // Parse data rows
    let currentModel: string | null = null;

    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;

      const cellVal = String(row[modelCol] ?? "").trim();

      // Skip subtotal/amount rows
      if (
        cellVal.toLowerCase() === "subtotal" ||
        cellVal.toLowerCase() === "amount" ||
        cellVal.toLowerCase() === "total"
      )
        continue;

      // If this cell has a model-like value, update current model
      if (cellVal && cellVal !== "0" && cellVal !== "NaN") {
        // Check if it's a category header (contains "Phase" or "Inverter" etc.)
        if (
          cellVal.match(
            /^(single|three|Sydney|Low|High)\s/i
          ) ||
          cellVal.includes("Inventory") ||
          cellVal.includes("Phase")
        ) {
          currentModel = null;
          continue;
        }
        currentModel = cellVal;
      }

      if (!currentModel) continue;

      // Get "In stock" value for this row
      const inStockVal =
        inStockCol >= 0 ? Number(row[inStockCol]) || 0 : 0;
      const shippingVal =
        shippingCol >= 0 ? Number(row[shippingCol]) || 0 : 0;
      const bookedVal =
        bookedCol >= 0 ? Number(row[bookedCol]) || 0 : 0;

      // Only process rows that have stock data
      if (inStockVal === 0 && shippingVal === 0 && bookedVal === 0)
        continue;

      const knownModel = matchModel(currentModel);
      if (knownModel) {
        // Accumulate stock — multiple rows per model (different shipments)
        if (entries[knownModel]) {
          entries[knownModel].available += inStockVal;
          entries[knownModel].inbound += shippingVal;
          entries[knownModel].reserved += bookedVal;
        } else {
          entries[knownModel] = {
            model: knownModel,
            available: inStockVal,
            awaitingStorage: 0,
            reserved: bookedVal,
            inbound: shippingVal,
            outbound: 0,
          };
        }
        matchedSet.add(knownModel);
      } else {
        unmatchedSet.add(currentModel);
      }
    }
  }

  return {
    entries,
    matched: Array.from(matchedSet),
    unmatched: Array.from(unmatchedSet),
  };
}

export function parseStockFile(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Check if there's a "Summary Table" sheet (SUNCLOUD Inventory Details format)
  const summarySheet = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("summary")
  );

  if (summarySheet) {
    return parseSummaryTable(wb, summarySheet);
  }

  // Otherwise try warehouse format (multiple sheets with "In stock" columns)
  return parseWarehouseSheets(wb);
}
