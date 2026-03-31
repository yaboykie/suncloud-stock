"use client";

import { useState, useEffect, useRef } from "react";

interface StockEntry {
  model: string;
  available: number;
}

interface UploadRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  modelsUpdated: number;
  blobUrl: string;
}

interface UploadResult {
  success: boolean;
  modelsUpdated: number;
  matched: string[];
  unmatched: string[];
  error?: string;
}

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState("");

  const [stock, setStock] = useState<Record<string, StockEntry>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load stock + history on mount
  useEffect(() => {
    fetch("/api/stock")
      .then((r) => r.json())
      .then((data) => {
        setStock(data.entries ?? {});
        setLastUpdated(data.lastUpdated ?? null);
      })
      .catch(() => {});
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {});
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadResult(null);
    setUploadError("");

    const form = new FormData();
    form.append("file", file);
    form.append("uploadedBy", "admin");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        if (data.unmatched?.length) {
          setUploadResult(data);
        }
      } else {
        setUploadResult(data);
        // Refresh stock + history
        const stockRes = await fetch("/api/stock");
        const stockData = await stockRes.json();
        setStock(stockData.entries ?? {});
        setLastUpdated(stockData.lastUpdated ?? null);

        const histRes = await fetch("/api/history");
        const histData = await histRes.json();
        if (Array.isArray(histData)) setHistory(histData);
      }
    } catch {
      setUploadError("Network error — could not upload file");
    }
    setUploading(false);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  const stockEntries = Object.values(stock).sort((a, b) =>
    a.model.localeCompare(b.model)
  );

  return (
    <div style={{ background: "#f8f8fa", minHeight: "100vh" }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <span style={styles.brand}>&#9728; Suncloud Energy</span>
            <span style={styles.headerSub}>Stock Manager</span>
          </div>
        </div>
      </div>

      <div style={styles.container}>
        {/* Upload Section */}
        <div style={styles.card}>
          <h2 style={styles.h2}>Upload Stock File</h2>
          <p style={{ color: "#8e8e93", fontSize: 13, marginBottom: 16 }}>
            Upload your warehouse Excel (.xlsx) or CSV file. The system will
            read the inventory data and match MODEL numbers to
            update stock levels. Supports both SUNCLOUD Inventory Details and Sydney Warehouse formats.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              ...styles.dropzone,
              borderColor: dragOver ? "#e8740a" : "#d1d1d6",
              background: dragOver ? "rgba(232,116,10,0.04)" : "#fff",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFileChange}
              style={{ display: "none" }}
            />
            {uploading ? (
              <p style={{ color: "#e8740a", fontWeight: 700 }}>
                Uploading &amp; processing...
              </p>
            ) : (
              <>
                <p style={{ fontSize: 32, marginBottom: 8 }}>&#128193;</p>
                <p style={{ fontWeight: 600, color: "#1a1a2e" }}>
                  Drop file here or click to browse
                </p>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>
                  .xlsx, .xls, or .csv
                </p>
              </>
            )}
          </div>

          {uploadError && <p style={styles.error}>{uploadError}</p>}

          {uploadResult?.success && (
            <div style={styles.successBox}>
              <strong>Upload successful!</strong> Updated{" "}
              {uploadResult.modelsUpdated} models.
              {uploadResult.unmatched.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: "#b45309" }}>
                    {uploadResult.unmatched.length} unmatched model(s) in file:{" "}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: "monospace" }}>
                    {uploadResult.unmatched.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Stock Table */}
        <div style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 style={styles.h2}>Current Stock Levels</h2>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: "#8e8e93" }}>
                Last updated:{" "}
                {new Date(lastUpdated).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>

          {stockEntries.length === 0 ? (
            <p style={{ color: "#8e8e93", fontSize: 14 }}>
              No stock data yet. Upload a file to get started.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Model</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>
                      Available
                    </th>
                    <th style={{ ...styles.th, textAlign: "center" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stockEntries.map((entry) => (
                    <tr key={entry.model}>
                      <td style={styles.td}>
                        <code style={{ fontSize: 12 }}>{entry.model}</code>
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {entry.available}
                      </td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              entry.available > 0
                                ? "rgba(22,163,74,0.1)"
                                : "rgba(220,38,38,0.1)",
                            color:
                              entry.available > 0 ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {entry.available > 0
                            ? `${entry.available} in stock`
                            : "Out of Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload History */}
        <div style={styles.card}>
          <h2 style={styles.h2}>Upload History</h2>

          {history.length === 0 ? (
            <p style={{ color: "#8e8e93", fontSize: 14 }}>
              No uploads yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>File</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Uploaded By</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>
                      Models Updated
                    </th>
                    <th style={styles.th}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td style={styles.td}>
                        <code style={{ fontSize: 12 }}>{h.filename}</code>
                      </td>
                      <td style={styles.td}>
                        {new Date(h.uploadedAt).toLocaleString("en-AU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td style={styles.td}>{h.uploadedBy}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {h.modelsUpdated}
                      </td>
                      <td style={styles.td}>
                        <a
                          href={h.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#e8740a", fontSize: 12 }}
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  brand: {
    fontSize: 18,
    fontWeight: 900,
    color: "#1a1a2e",
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 18,
    fontWeight: 800,
    color: "#1a1a2e",
    margin: 0,
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 8,
    fontWeight: 600,
  },
  successBox: {
    marginTop: 16,
    padding: "14px 18px",
    background: "rgba(22,163,74,0.06)",
    border: "1px solid rgba(22,163,74,0.2)",
    borderRadius: 10,
    fontSize: 14,
    color: "#15803d",
  },
  header: {
    borderBottom: "1px solid #e5e5ea",
    padding: "14px 0",
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(12px)",
    position: "sticky" as const,
    top: 0,
    zIndex: 20,
  },
  headerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSub: {
    fontSize: 12,
    color: "#e8740a",
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    fontWeight: 700,
    marginLeft: 12,
  },
  container: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "24px 20px 60px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: "24px 28px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f4",
  },
  dropzone: {
    border: "2px dashed #d1d1d6",
    borderRadius: 12,
    padding: "40px 20px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 14,
  },
  th: {
    textAlign: "left" as const,
    padding: "10px 12px",
    borderBottom: "2px solid #f0f0f4",
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    color: "#8e8e93",
    fontWeight: 700,
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f0f0f4",
    color: "#1a1a2e",
  },
};
