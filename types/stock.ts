export interface StockEntry {
  model: string;
  available: number;
  awaitingStorage: number;
  reserved: number;
  inbound: number;
  outbound: number;
}

export interface StockData {
  lastUpdated: string;
  uploadedBy: string;
  entries: Record<string, StockEntry>;
}

export interface UploadRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  modelsUpdated: number;
  blobUrl: string;
}
