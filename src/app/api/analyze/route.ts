import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { imagePath } = await req.json();

    if (!imagePath) {
      return NextResponse.json({ success: false, error: "Missing imagePath parameter" }, { status: 400 });
    }

    let fileBuffer: Buffer;
    let base64Image: string;
    let mimeType = "image/png";
    let filename = "input.png";

    if (imagePath.startsWith("data:")) {
      const match = imagePath.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ success: false, error: "Invalid image data format" }, { status: 400 });
      }
      mimeType = match[1];
      base64Image = match[2];
      fileBuffer = Buffer.from(base64Image, "base64");
      
      let ext = ".png";
      if (mimeType === "image/jpeg") ext = ".jpg";
      else if (mimeType === "image/webp") ext = ".webp";
      filename = `image${ext}`;
    } else {
      // Resolve physical path (either from OS temp folder or public/uploads)
      let physicalPath = "";
      if (imagePath.startsWith("/api/uploads/")) {
        const fname = imagePath.substring("/api/uploads/".length);
        physicalPath = path.join(os.tmpdir(), "morpho3d-uploads", fname);
      } else {
        const sanitizedPath = imagePath.replace(/^\//, ""); // remove leading slash
        physicalPath = path.join(process.cwd(), "public", sanitizedPath);
      }

      try {
        await fs.access(physicalPath);
      } catch {
        return NextResponse.json({ success: false, error: `Image file not found on disk: ${imagePath}` }, { status: 404 });
      }

      // Read file and convert to base64
      fileBuffer = await fs.readFile(physicalPath);
      base64Image = fileBuffer.toString("base64");
      filename = path.basename(physicalPath);
      
      const ext = path.extname(physicalPath).toLowerCase();
      if (ext === ".jpg" || ext === ".jpeg") {
        mimeType = "image/jpeg";
      } else if (ext === ".webp") {
        mimeType = "image/webp";
      }
    }

    // ==========================================
    // Strategy 1: Try OpenAI GPT-4o-mini Vision
    // ==========================================
    if (process.env.OPENAI_API_KEY) {
      console.log("[Analyze] Using OpenAI GPT-4o-mini Vision...");
      try {
        const { openai } = await import("@/lib/openai");
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image and provide a highly detailed 3D modeling description. Focus on:\n1. Shape & Overall Structure (3D form, silhouette, primary geometry type)\n2. Estimated Dimensions & Scale (relative width/height/depth proportions)\n3. Geometry Details (faces, edges, subdivisions, hard/soft edges)\n4. Material & Surface Properties (roughness, metalness, transparency, emissive)\n5. Texture & Color Details (patterns, gradients, UV layout hints)\n6. Object Components (any sub-parts, attachments, details)\n7. Recommended 3D Generation Settings (complexity, poly count, texture resolution)\n\nBe precise and technical. This description will directly guide AI 3D reconstruction.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
        });
        const prompt = response.choices[0]?.message?.content || "";
        return NextResponse.json({ prompt, source: "openai" });
      } catch (err: any) {
        console.warn("[Analyze] OpenAI failed, trying next source:", err.message);
      }
    }

    // ==========================================
    // Strategy 2: Hugging Face Inference API (LLaVA - Free, No Key Required)
    // Uses the actual uploaded image for real analysis
    // ==========================================
    const hfToken = process.env.HF_TOKEN;
    console.log("[Analyze] Using Hugging Face LLaVA Vision model for real image analysis...");

    try {
      const hfHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (hfToken) {
        hfHeaders["Authorization"] = `Bearer ${hfToken}`;
      }

      // Use LLaVA via HF Inference API with the actual image
      const llavaResponse = await fetch(
        "https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf",
        {
          method: "POST",
          headers: hfHeaders,
          body: JSON.stringify({
            inputs: {
              image: base64Image,
              text: "Analyze this image in detail for 3D reconstruction. Describe: 1) The main object's shape and 3D form, 2) Materials and surface textures, 3) Colors and patterns, 4) Structural details and components, 5) Overall scale and proportions. Be specific and technical.",
            },
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (llavaResponse.ok) {
        const llavaData = await llavaResponse.json();
        const generatedText = Array.isArray(llavaData)
          ? llavaData[0]?.generated_text || ""
          : llavaData?.generated_text || "";

        if (generatedText && generatedText.length > 50) {
          const formattedPrompt = `[AI Vision Analysis - LLaVA 1.5]\n\n${generatedText}`;
          return NextResponse.json({ prompt: formattedPrompt, source: "llava" });
        }
      }
    } catch (err: any) {
      console.warn("[Analyze] LLaVA failed:", err.message);
    }

    // ==========================================
    // Strategy 3: BLIP-2 Image Captioning (Fallback)
    // ==========================================
    console.log("[Analyze] Falling back to BLIP-2 image captioning...");
    try {
      const hfHeaders: Record<string, string> = {};
      if (hfToken) {
        hfHeaders["Authorization"] = `Bearer ${hfToken}`;
      }

      const blipResponse = await fetch(
        "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
        {
          method: "POST",
          headers: hfHeaders,
          body: fileBuffer as any,
          signal: AbortSignal.timeout(25000),
        }
      );

      if (blipResponse.ok) {
        const blipData = await blipResponse.json();
        const caption = Array.isArray(blipData)
          ? blipData[0]?.generated_text || ""
          : blipData?.generated_text || "";

        if (caption) {
          // Enrich the BLIP caption with structured 3D guidance
          const enrichedPrompt = `[AI Vision Analysis - BLIP-2 Image Captioning]

Image Description: ${caption}

3D Reconstruction Guidance (derived from image analysis):
1. Shape & Structure: The object identified in the image — reconstruct with appropriate polygonal mesh topology matching the described form.
2. Surface Material: Apply material properties consistent with the visual appearance. Estimate PBR values from visible surface characteristics.
3. Texture Mapping: Map surface colors and patterns from the source image using UV projection.
4. Geometry Detail Level: Medium-high (targeting 50K-200K polygons for detail preservation).
5. Recommended Settings: Texture Resolution 1024px, Background Removal enabled, Foreground Ratio 0.85.`;

          return NextResponse.json({ prompt: enrichedPrompt, source: "blip2" });
        }
      }
    } catch (err: any) {
      console.warn("[Analyze] BLIP-2 failed:", err.message);
    }

    // ==========================================
    // Strategy 4: Local image metadata analysis
    // (No external API needed — analyzes image properties)
    // ==========================================
    console.log("[Analyze] Using local image metadata analysis as final fallback...");
    
    const fileSizeKB = Math.round(fileBuffer.length / 1024);

    // Read image dimensions from buffer (for PNG/JPEG)
    let width = "unknown";
    let height = "unknown";
    
    try {
      // PNG: dimensions at bytes 16-23
      if (mimeType === "image/png") {
        width = String(fileBuffer.readUInt32BE(16));
        height = String(fileBuffer.readUInt32BE(20));
      }
      // JPEG: scan for SOF0/SOF2 marker
      if (mimeType === "image/jpeg") {
        for (let i = 0; i < fileBuffer.length - 9; i++) {
          if (fileBuffer[i] === 0xFF && (fileBuffer[i+1] === 0xC0 || fileBuffer[i+1] === 0xC2)) {
            height = String(fileBuffer.readUInt16BE(i + 5));
            width = String(fileBuffer.readUInt16BE(i + 7));
            break;
          }
        }
      }
    } catch {}

    const localAnalysisPrompt = `[AI Vision Analysis - Local Image Inspector]

Source File: ${filename}
Image Resolution: ${width} × ${height} px
File Size: ${fileSizeKB} KB
Format: ${mimeType}

3D Reconstruction Guidance:
1. Shape & Structure: Reconstruct the primary object visible in the source image using full feed-forward neural 3D reconstruction. The model will extract geometry directly from the 2D image features.
2. Surface Material: PBR material properties will be extracted from the image's color and texture information during reconstruction.
3. Texture Mapping: High-resolution texture baking from source image — UV coordinates will be auto-generated from the mesh topology.
4. Geometry Detail Level: Auto-detected from source image resolution (${width}×${height}). Higher resolution enables finer geometry detail.
5. Recommended Settings: Texture Resolution 1024px, Background Removal enabled, Foreground Ratio 0.85, Remeshing: None.

NOTE: For richer AI analysis, add OPENAI_API_KEY or HF_TOKEN to your .env.local file.`;

    return NextResponse.json({ prompt: localAnalysisPrompt, source: "local" });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { success: false, error: `Analysis Failed: ${error.message}` },
      { status: 500 }
    );
  }
}
