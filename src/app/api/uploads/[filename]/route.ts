import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    // Next.js 15+ has params as a Promise. Let's handle both Promise and object.
    const resolvedParams = typeof (params as any).then === "function" 
      ? await (params as any) 
      : params;
    
    const filename = resolvedParams.filename;
    const filePath = path.join(os.tmpdir(), "morpho3d-uploads", filename);
    
    const fileBuffer = await fs.readFile(filePath);
    
    const ext = path.extname(filename).toLowerCase();
    let mimeType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") {
      mimeType = "image/jpeg";
    } else if (ext === ".webp") {
      mimeType = "image/webp";
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("File not found", { status: 404 });
  }
}
