import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  return NextResponse.redirect(new URL(`/api/uploads/${filename}`, request.url));
}
