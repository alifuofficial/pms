"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getSystemSettings } from "./settings";
import * as ftp from "basic-ftp";
import { Readable } from "stream";

export async function uploadFile(file: File) {
  try {
    const settings = await getSystemSettings();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${crypto.randomUUID()}-${file.name.replace(/\s+/g, "_")}`;

    if (settings.ftpEnabled && settings.ftpHost) {
      const client = new ftp.Client(15000); // 15s timeout
      client.ftp.ipFamily = 4; // Explicitly IPv4
      client.ftp.verbose = true; // Verbose socket logs for debugging
      try {
        await client.access({
          host: settings.ftpHost,
          port: settings.ftpPort || 21,
          user: settings.ftpUser || "",
          password: settings.ftpPass || "",
        });
        
        await client.uploadFrom(Readable.from(buffer), filename);
        
        const baseUrl = settings.ftpBaseUrl 
          ? (settings.ftpBaseUrl.endsWith("/") ? settings.ftpBaseUrl : `${settings.ftpBaseUrl}/`)
          : "/api/uploads/";
          
        return { success: true, url: `${baseUrl}${filename}` };
      } catch (ftpError) {
        console.error("FTP Upload Error:", ftpError);
        return { success: false, error: "FTP Upload failed. Check connection settings." };
      } finally {
        client.close();
      }
    }

    // Local Storage
    const isProd = process.env.NODE_ENV === "production";
    const uploadsDir = isProd 
      ? "/app/data/uploads" 
      : join(process.cwd(), "public", "uploads");

    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {}

    const path = join(uploadsDir, filename);
    await writeFile(path, buffer);
    
    // Return the API route URL instead of direct public path
    return { success: true, url: `/api/uploads/${filename}` };
  } catch (error) {
    console.error("Upload Error:", error);
    return { success: false, error: "Failed to upload file" };
  }
}
