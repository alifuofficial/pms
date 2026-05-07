import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  console.log(`[API] Serving file: ${filename}`);

  // Persistent path in production
  const persistentPath = process.env.NODE_ENV === "production" 
    ? join("/app/data/uploads", filename)
    : join(process.cwd(), "public/uploads", filename);

  // Legacy fallback (if someone uploaded to public/uploads in prod by mistake)
  const legacyPath = join(process.cwd(), "public/uploads", filename);

  const finalPath = existsSync(persistentPath) ? persistentPath : (existsSync(legacyPath) ? legacyPath : null);

  if (finalPath) {
    try {
      const fileBuffer = await readFile(finalPath);
      const ext = filename.split('.').pop()?.toLowerCase();
      
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf'
      };

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentTypes[ext || ''] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    } catch (error) {
      return new NextResponse("Error reading file", { status: 500 });
    }
  }

  return new NextResponse("File not found", { status: 404 });
}
