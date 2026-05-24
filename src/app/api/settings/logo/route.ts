import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile } from "@/lib/actions/storage";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Validate size (2 MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 2 MB." }, { status: 400 });
    }

    const uploadResult = await uploadFile(file);
    
    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ url: uploadResult.url });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
