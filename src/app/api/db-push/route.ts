import { execSync } from "child_process";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL || "file:/app/data/prod.db";
    
    // We need to find the prisma binary and the schema file
    // In standalone mode, they are moved around
    const appDir = process.cwd();
    const schemaPath = path.join(appDir, "prisma", "schema.prisma");
    
    console.log("App Dir:", appDir);
    console.log("Schema Path:", schemaPath);
    console.log("Database URL:", databaseUrl);

    // Try to run prisma db push
    const output = execSync(
      `npx prisma db push --url "${databaseUrl}" --accept-data-loss --force-reset --schema "${schemaPath}"`,
      { 
        encoding: "utf-8",
        env: { ...process.env, DATABASE_URL: databaseUrl }
      }
    );

    return NextResponse.json({
      success: true,
      message: "Database synchronized successfully.",
      output
    });
  } catch (error: any) {
    console.error("Manual DB Push Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    }, { status: 500 });
  }
}
