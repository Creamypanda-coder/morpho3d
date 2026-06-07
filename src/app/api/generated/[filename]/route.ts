import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const resolvedParams = typeof (params as any).then === "function" 
      ? await (params as any) 
      : params;
      
    const filename = resolvedParams.filename;
    const filePath = path.join(os.tmpdir(), "morpho3d-generated", filename);
    
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse("Model not found", { status: 404 });
  }
}
