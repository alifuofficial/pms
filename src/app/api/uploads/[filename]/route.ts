import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
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

  // Fallback: Check if FTP is enabled and retrieve file from FTP server
  try {
    const { prisma } = await import("@/lib/prisma");
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });

    if (settings?.ftpEnabled && settings?.ftpHost) {
      const ftp = await import("basic-ftp");
      const { Writable } = await import("stream");
      const client = new ftp.Client(15000);
      client.ftp.ipFamily = 4;

      try {
        await client.access({
          host: settings.ftpHost,
          port: settings.ftpPort || 21,
          user: settings.ftpUser || "",
          password: settings.ftpPass || "",
        });

        const chunks: Buffer[] = [];
        const writableStream = new Writable({
          write(chunk, encoding, callback) {
            chunks.push(Buffer.from(chunk));
            callback();
          }
        });

        await client.downloadTo(writableStream, filename);
        const fileBuffer = Buffer.concat(chunks);
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
      } catch (ftpError) {
        console.error(`[API] Error downloading file ${filename} from FTP:`, ftpError);
      } finally {
        client.close();
      }
    }
  } catch (error) {
    console.error("[API] Failed to retrieve settings or download from FTP:", error);
  }

  return new NextResponse("File not found", { status: 404 });
}
