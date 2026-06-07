import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";

async function runGradioEndpoint(spaceHost: string, fnIndex: number, data: any[], hfToken?: string): Promise<any[]> {
  const sessionHash = Math.random().toString(36).substring(2);
  console.log(`[API Generate] Joining queue for ${spaceHost} fn_index ${fnIndex}...`);
  
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hfToken) {
    headers["Authorization"] = `Bearer ${hfToken}`;
  }

  const joinRes = await fetch(`${spaceHost}/queue/join`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      data,
      fn_index: fnIndex,
      session_hash: sessionHash
    })
  });
  
  if (!joinRes.ok) {
    const errText = await joinRes.text();
    throw new Error(`Queue join failed for fn_index ${fnIndex} (status ${joinRes.status}): ${errText}`);
  }
  
  const joinData = await joinRes.json();
  console.log(`[API Generate] Joined queue. Event ID: ${joinData.event_id}`);

  console.log(`[API Generate] Connecting to SSE stream for fn_index ${fnIndex}...`);
  
  const streamHeaders: Record<string, string> = {};
  if (hfToken) {
    streamHeaders["Authorization"] = `Bearer ${hfToken}`;
  }

  const streamRes = await fetch(
    `${spaceHost}/queue/data?session_hash=${sessionHash}`,
    { 
      method: "GET",
      headers: streamHeaders
    }
  );

  if (!streamRes.ok) {
    throw new Error(`SSE stream failed: ${streamRes.statusText}`);
  }

  if (!streamRes.body) {
    throw new Error("Response body is null");
  }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data:")) {
        const rawData = line.substring(5).trim();
        if (!rawData) continue;
        
        const event = JSON.parse(rawData);
        console.log(`[API Generate] [fn_index ${fnIndex}] SSE Event: ${event.msg}`);
        
        if (event.msg === "process_completed") {
          if (event.success === false) {
            throw new Error(event.output?.error || "Process failed in Gradio queue.");
          }
          console.log(`[API Generate] [fn_index ${fnIndex}] Process completed successfully!`);
          return event.output.data;
        } else if (event.msg === "process_failed") {
          throw new Error(`[API Generate] [fn_index ${fnIndex}] Process failed: ${event.message || "Unknown error"}`);
        }
      }
    }
  }
  throw new Error(`[API Generate] [fn_index ${fnIndex}] SSE Stream ended before completion.`);
}

export async function POST(req: NextRequest) {
  try {
    const { imagePath, modelType = "stable-fast-3d", analysisPrompt } = await req.json();

    // Log the analysis context if provided
    if (analysisPrompt) {
      console.log("[API Generate] === AI Image Analysis Context ===");
      console.log(analysisPrompt.substring(0, 500) + (analysisPrompt.length > 500 ? "..." : ""));
      console.log("[API Generate] === End Analysis Context ===");
    }

    if (!imagePath) {
      return NextResponse.json({ success: false, error: "Missing imagePath parameter" }, { status: 400 });
    }

    let fileData: Buffer;
    let filename = "input.png";
    let mimeType = "image/png";

    if (imagePath.startsWith("data:")) {
      const match = imagePath.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ success: false, error: "Invalid image data format" }, { status: 400 });
      }
      mimeType = match[1];
      const base64Data = match[2];
      fileData = Buffer.from(base64Data, "base64");
      
      let ext = ".png";
      if (mimeType === "image/jpeg") ext = ".jpg";
      else if (mimeType === "image/webp") ext = ".webp";
      filename = `input${ext}`;
    } else {
      // Resolve physical path (either from OS temp folder or public/uploads)
      let absoluteImagePath = "";
      if (imagePath.startsWith("/api/uploads/")) {
        const fname = imagePath.substring("/api/uploads/".length);
        absoluteImagePath = path.join(os.tmpdir(), "morpho3d-uploads", fname);
      } else {
        const relativeImagePath = imagePath.replace(/^\//, "");
        absoluteImagePath = path.join(process.cwd(), "public", relativeImagePath);
      }

      // Verify input file exists
      try {
        await fs.access(absoluteImagePath);
      } catch {
        return NextResponse.json(
          { success: false, error: `Uploaded image file not found: ${imagePath}` },
          { status: 404 }
        );
      }

      fileData = await fs.readFile(absoluteImagePath);
      filename = path.basename(absoluteImagePath);
      
      const ext = path.extname(absoluteImagePath).toLowerCase();
      if (ext === ".jpg" || ext === ".jpeg") {
        mimeType = "image/jpeg";
      } else if (ext === ".webp") {
        mimeType = "image/webp";
      }
    }

    const hfToken = process.env.HF_TOKEN;

    // Function to run Stable Fast 3D Pipeline
    const runStableFast3D = async () => {
      const spaceHost = "https://stabilityai-stable-fast-3d.hf.space";
      console.log(`[API Generate] Initiating Stable Fast 3D pipeline`);

      // 1. Upload the image file
      const blob = new Blob([fileData as any], { type: mimeType });
      const formData = new FormData();
      formData.append("files", blob, filename);

      const uploadHeaders: Record<string, string> = {};
      if (hfToken) {
        uploadHeaders["Authorization"] = `Bearer ${hfToken}`;
      }

      console.log("[API Generate] Uploading source image to SF3D space...");
      const uploadRes = await fetch(`${spaceHost}/upload`, {
        method: "POST",
        headers: uploadHeaders,
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error(`Hugging Face upload failed for SF3D: ${uploadRes.statusText}`);
      }
      
      const uploadData = await uploadRes.json();
      const uploadedFileUrl = uploadData[0];
      console.log(`[API Generate] Image uploaded. Temp path: ${uploadedFileUrl}`);

      // 2. Preprocess (Requires background removal)
      console.log("[API Generate] Running SF3D Preprocess (background removal)...");
      const preprocessResult = await runGradioEndpoint(spaceHost, 4, [
        { path: uploadedFileUrl, meta: { _type: "gradio.FileData" } },
        0.85 // Foreground Ratio
      ], hfToken);

      const stateVal = preprocessResult ? preprocessResult[2] : null;

      // 3. Generate 3D Reconstruction
      console.log("[API Generate] Running SF3D Generate (3D reconstruction)...");
      const generateResult = await runGradioEndpoint(spaceHost, 5, [
        null, // component 13 (Run button)
        { path: uploadedFileUrl, meta: { _type: "gradio.FileData" } }, // component 7 (Input image)
        stateVal, // component 2 (State)
        0.85, // component 9 (Foreground Ratio)
        "None", // component 10 (Remeshing)
        -1, // component 11 (Target Vertex Count)
        1024 // component 12 (Texture Size)
      ], hfToken);

      const glbOutput = generateResult ? generateResult[4] : null;
      if (!glbOutput || !glbOutput.url) {
        throw new Error("SF3D generation failed: No GLB URL returned.");
      }

      return glbOutput.url;
    };

    // Function to run TripoSR Pipeline (Fallback)
    const runTripoSR = async () => {
      const spaceHost = "https://stabilityai-triposr.hf.space";
      console.log(`[API Generate] Initiating TripoSR pipeline`);

      const blob = new Blob([fileData as any], { type: mimeType });
      const formData = new FormData();
      formData.append("files", blob, filename);

      const uploadHeaders: Record<string, string> = {};
      if (hfToken) {
        uploadHeaders["Authorization"] = `Bearer ${hfToken}`;
      }

      console.log("[API Generate] Uploading source image to TripoSR space...");
      const uploadRes = await fetch(`${spaceHost}/upload`, {
        method: "POST",
        headers: uploadHeaders,
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error(`Hugging Face upload failed for TripoSR: ${uploadRes.statusText}`);
      }
      
      const uploadData = await uploadRes.json();
      const uploadedFileUrl = uploadData[0];
      console.log(`[API Generate] Image uploaded. Temp path: ${uploadedFileUrl}`);

      // 2. Preprocess (Background removal)
      console.log("[API Generate] Running TripoSR Preprocess (background removal)...");
      const preprocessResult = await runGradioEndpoint(spaceHost, 2, [
        { path: uploadedFileUrl, meta: { _type: "gradio.FileData" } },
        true,  // Remove Background
        0.85   // Foreground Ratio
      ], hfToken);
      const processedImage = preprocessResult ? preprocessResult[0] : null;

      if (!processedImage) {
        throw new Error("TripoSR preprocess failed: processed image is null");
      }

      // 3. Generate 3D Reconstruction
      console.log("[API Generate] Running TripoSR Generate (3D reconstruction)...");
      const generateResult = await runGradioEndpoint(spaceHost, 3, [
        processedImage,
        128  // Marching Cubes Resolution
      ], hfToken);
      const glbOutput = generateResult ? generateResult[1] : null;

      if (!glbOutput || !glbOutput.url) {
        throw new Error("TripoSR generation failed: No GLB URL returned.");
      }

      return glbOutput.url;
    };

    let selectedModel = modelType;
    let finalModelUrl: string;
    let fallbackTriggered = false;

    if (selectedModel === "stable-fast-3d") {
      try {
        finalModelUrl = await runStableFast3D();
      } catch (err: any) {
        console.warn("[API Generate] Stable Fast 3D failed. Falling back to TripoSR. Error:", err.message);
        fallbackTriggered = true;
        selectedModel = "triposr";
        finalModelUrl = await runTripoSR();
      }
    } else {
      finalModelUrl = await runTripoSR();
    }

    // Download final model
    console.log(`[API Generate] Downloading final model from ${finalModelUrl}`);
    const downloadRes = await fetch(finalModelUrl);
    if (!downloadRes.ok) {
      throw new Error(`Failed to download model from ${finalModelUrl}: ${downloadRes.statusText}`);
    }
    const glbBuffer = await downloadRes.arrayBuffer();
    console.log("[API Generate] Responding with GLB binary payload.");

    return new NextResponse(glbBuffer, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "no-store, must-revalidate",
        "x-model-used": selectedModel,
        "x-fallback-triggered": String(fallbackTriggered),
      },
    });

  } catch (error: any) {
    console.error("Generation API error:", error);
    return NextResponse.json(
      { success: false, error: `Generation API failed: ${error.message}` },
      { status: 500 }
    );
  }
}
