// All model strings from PRICE_DATA in index.html
// Used for matching uploaded Excel rows to products
export const KNOWN_MODELS: string[] = [
  // 1Ph LV Hybrid Inverter
  "SUN-5K-SG04LP1-AU",
  "SUN-6K-SG04LP1-AU",
  "SUN-8K-SG05LP1-AU",
  "SUN-10K-SG02LP1-AU-AM3",
  "SUN-12K-SG02LP1-AU-AM3",
  "SUN-14K-SG01LP1-AU",
  "SUN-16K-SG01LP1-AU",
  // 3Ph LV Hybrid Inverter
  "SUN-5K-SG04LP3-AU",
  "SUN-6K-SG04LP3-AU",
  "SUN-8K-SG04LP3-AU",
  "SUN-10K-SG04LP3-AU",
  "SUN-12K-SG04LP3-AU",
  "SUN-15K-SG05LP3-AU-SM2",
  "SUN-18K-SG05LP3-AU-SM2",
  "SUN-20K-SG05LP3-AU-SM2",
  // 3Ph HV Hybrid Inverter
  "SUN-10K-SG01HP3-AU-AM2",
  "SUN-12K-SG01HP3-AU-AM2",
  "SUN-15K-SG01HP3-AU-AM2",
  "SUN-20K-SG01HP3-AU-AM2",
  "SUN-25K-SG01HP3-AU-AM2",
  "SUN-29.9K-SG01HP3-AU-BM3",
  "SUN-40K-SG01HP3-AU-BM4",
  "SUN-50K-SG01HP3-AU-BM4",
  "SUN-60K-SG02HP3-AU-BM6",
  "SUN-75K-SG02HP3-AU-BM6",
  "SUN-80K-SG02HP3-AU-BM6",
  // 1Ph String Inverter
  "SUN-5K-G04-AU",
  "SUN-6K-G04-AU",
  "SUN-8K-G02P1-AU-AM2",
  "SUN-10K-G02P1-AU-AM2",
  // 3Ph String Inverter
  "SUN-5K-G05-AU",
  "SUN-6K-G05-AU",
  "SUN-8K-G05-AU",
  "SUN-10K-G05-AU",
  "SUN-12K-G05-AU",
  "SUN-15K-G05-AU",
  "SUN-20K-G05-AU",
  "SUN-25K-G05-AU",
  // LV Battery
  "RW-F10.2",
  "AI-W5.1-B",
  "SE-G5.1Pro-B",
  "AI-W5.1-PDU1-B +Base",
  // HV Battery
  "BOS-GM5.1",
  "HVB750V/100A-EU",
  "3U-HRACK",
  "3U-LRACK",
  "GE-F60",
  "GE-F120-2H6",
  // Parts & Accessories
  "SDM630MCT-40mA / ESCT-TA16",
  "Combiner Box",
  // All-In-One (Single Phase)
  "AI-W5.1-5P1-AU-B",
  "AI-W5.1-6P1-AU-B",
  "AI-W5.1-8P1-AU-B",
  // All-In-One (Three Phase)
  "AI-W5.1-5P3-AU-B",
  "AI-W5.1-6P3-AU-B",
  "AI-W5.1-8P3-AU-B",
  "AI-W5.1-10P3-AU-B",
  "AI-W5.1-12P3-AU-B",
  // All-In-One Battery & PDU
  "PDU1-B+Base",
  "PDU3-B+Base",
];

// Build a normalized lookup map: uppercase trimmed → original model string
export const MODEL_LOOKUP: Record<string, string> = {};
for (const m of KNOWN_MODELS) {
  MODEL_LOOKUP[m.trim().toUpperCase()] = m;
}
