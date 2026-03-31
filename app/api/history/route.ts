import { NextResponse } from "next/server";
import { getUploadHistory } from "@/lib/stock";

export async function GET() {
  const history = await getUploadHistory();
  return NextResponse.json(history);
}
