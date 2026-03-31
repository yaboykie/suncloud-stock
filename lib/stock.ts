import { put, list, del } from "@vercel/blob";
import { StockData, UploadRecord } from "@/types/stock";

const STOCK_KEY = "stock/current.json";
const HISTORY_KEY = "stock/history.json";

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function fetchBlob(pathname: string): Promise<string | null> {
  if (!blobConfigured()) return null;
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export async function getStockData(): Promise<StockData | null> {
  const text = await fetchBlob(STOCK_KEY);
  if (!text) return null;
  return JSON.parse(text) as StockData;
}

export async function saveStockData(data: StockData): Promise<void> {
  if (!blobConfigured()) throw new Error("Blob storage not configured");
  const { blobs } = await list({ prefix: STOCK_KEY, limit: 1 });
  for (const b of blobs) await del(b.url);

  await put(STOCK_KEY, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function getUploadHistory(): Promise<UploadRecord[]> {
  const text = await fetchBlob(HISTORY_KEY);
  if (!text) return [];
  return JSON.parse(text) as UploadRecord[];
}

export async function appendUploadRecord(
  record: UploadRecord
): Promise<void> {
  if (!blobConfigured()) throw new Error("Blob storage not configured");
  const history = await getUploadHistory();
  history.unshift(record);

  const { blobs } = await list({ prefix: HISTORY_KEY, limit: 1 });
  for (const b of blobs) await del(b.url);

  await put(HISTORY_KEY, JSON.stringify(history), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function storeUploadedFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  if (!blobConfigured()) throw new Error("Blob storage not configured");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const pathname = `uploads/${ts}_${filename}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: false,
  });
  return blob.url;
}
