import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Ensure the uploads directory exists in OS temp directory
    const uploadsDir = path.join(os.tmpdir(), "morpho3d-uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Sanitize the filename
    const originalName = file.name || "input.png";
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(uploadsDir, sanitizedName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      imagePath: `/api/uploads/${sanitizedName}`,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
