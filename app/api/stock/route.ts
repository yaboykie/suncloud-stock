import { NextResponse } from "next/server";
import { getStockData } from "@/lib/stock";

export async function GET() {
  const data = await getStockData();
  if (!data) {
    return NextResponse.json(
      { entries: {}, lastUpdated: null, uploadedBy: null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
