import { NextResponse } from "next/server";
import { parseStockFile } from "@/lib/parse-excel";
import {
  saveStockData,
  storeUploadedFile,
  appendUploadRecord,
} from "@/lib/stock";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const uploadedBy = (formData.get("uploadedBy") as string) || "admin";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse the Excel/CSV file
  const { entries, matched, unmatched } = parseStockFile(buffer);

  if (matched.length === 0) {
    return NextResponse.json(
      {
        error:
          "No matching models found in the uploaded file. Make sure it contains inventory data with recognizable model names.",
        unmatched,
      },
      { status: 400 }
    );
  }

  // Store the raw file
  const blobUrl = await storeUploadedFile(buffer, file.name);

  // Update stock data
  await saveStockData({
    lastUpdated: new Date().toISOString(),
    uploadedBy,
    entries,
  });

  // Record in history
  await appendUploadRecord({
    id: crypto.randomUUID(),
    filename: file.name,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    modelsUpdated: matched.length,
    blobUrl,
  });

  return NextResponse.json({
    success: true,
    modelsUpdated: matched.length,
    matched,
    unmatched,
  });
}
