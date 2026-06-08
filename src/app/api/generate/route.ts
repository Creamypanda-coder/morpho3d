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

  // Gradio v5 (Trellis) uses the /gradio_api prefix for queue endpoints
  const isGradioV5 = spaceHost.includes("trellis");
  const prefix = isGradioV5 ? "/gradio_api" : "";

  const joinRes = await fetch(`${spaceHost}${prefix}/queue/join`, {
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
    `${spaceHost}${prefix}/queue/data?session_hash=${sessionHash}`,
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
        absoluteImagePath = path.join(os.tmpdir(), "toms3d-uploads", fname);
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

    // Function to run Microsoft Trellis Pipeline (SOTA High-Quality)
    const runTrellis = async () => {
      const spaceHost = "https://trellis-community-trellis.hf.space";
      console.log(`[API Generate] Initiating Microsoft TRELLIS pipeline`);

      // 1. Upload the image file using Gradio v5 upload endpoint
      const blob = new Blob([fileData as any], { type: mimeType });
      const formData = new FormData();
      formData.append("files", blob, filename);

      const uploadHeaders: Record<string, string> = {};
      if (hfToken) {
        uploadHeaders["Authorization"] = `Bearer ${hfToken}`;
      }

      console.log("[API Generate] Uploading source image to TRELLIS space...");
      const uploadRes = await fetch(`${spaceHost}/gradio_api/upload`, {
        method: "POST",
        headers: uploadHeaders,
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error(`Hugging Face upload failed for TRELLIS: ${uploadRes.statusText}`);
      }
      
      const uploadData = await uploadRes.json();
      const uploadedFileUrl = uploadData[0];
      console.log(`[API Generate] Image uploaded. Temp path: ${uploadedFileUrl}`);

      // Construct file URL so the ZeroGPU worker can download the resource
      const fileUrl = `${spaceHost}/gradio_api/file=${uploadedFileUrl}`;

      // 2. Generate 3D Reconstruction (fn_index: 11)
      console.log("[API Generate] Running TRELLIS Generate (3D reconstruction & GLB extraction)...");
      const generateResult = await runGradioEndpoint(spaceHost, 11, [
        {
          path: uploadedFileUrl,
          url: fileUrl,
          orig_name: filename,
          meta: { _type: "gradio.FileData" }
        }, // image (6)
        [], // multiimages (8)
        null, // state (39)
        0, // seed (11)
        7.5, // ss_guidance_strength (15)
        12, // ss_sampling_steps (16)
        3.0, // slat_guidance_strength (20)
        12, // slat_sampling_steps (21)
        "stochastic", // multiimage_algo (23)
        0.95, // mesh_simplify (27)
        1024 // texture_size (28)
      ], hfToken);

      const glbOutput = generateResult ? generateResult[1] : null;
      if (!glbOutput || !glbOutput.url) {
        throw new Error("TRELLIS generation failed: No GLB URL returned.");
      }

      return glbOutput.url;
    };

    // Function to run Tripo AI Platform API (Commercial SOTA)
    const runTripoAPI = async () => {
      const tripoApiKey = process.env.TRIPO_API_KEY;
      if (!tripoApiKey) {
        throw new Error("TRIPO_API_KEY is not configured in .env.local");
      }

      console.log(`[API Generate] Initiating Tripo AI Platform API pipeline`);

      // 1. Upload the file to Tripo
      const blob = new Blob([fileData as any], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, filename);

      console.log("[API Generate] Uploading source image to Tripo API...");
      const uploadRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tripoApiKey}`
        },
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error(`Tripo upload failed: ${uploadRes.statusText}`);
      }

      const uploadData = await uploadRes.json();
      if (uploadData.code !== 0 || !uploadData.data?.image_token) {
        throw new Error(`Tripo upload returned error: ${uploadData.message || "Unknown error"}`);
      }

      const imageToken = uploadData.data.image_token;
      console.log(`[API Generate] Image uploaded to Tripo. Token: ${imageToken}`);

      // 2. Submit image_to_model task
      console.log("[API Generate] Creating Tripo image_to_model generation task...");
      const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tripoApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "image_to_model",
          file: {
            type: mimeType.split("/")[1] || "png",
            file_token: imageToken
          }
        })
      });

      if (!taskRes.ok) {
        throw new Error(`Tripo task creation failed: ${taskRes.statusText}`);
      }

      const taskData = await taskRes.json();
      if (taskData.code !== 0 || !taskData.data?.task_id) {
        throw new Error(`Tripo task creation returned error: ${taskData.message || "Unknown error"}`);
      }

      const taskId = taskData.data.task_id;
      console.log(`[API Generate] Tripo task created. ID: ${taskId}. Polling for completion...`);

      // 3. Poll task status until complete
      const maxRetries = 40; // 40 * 2 seconds = 80 seconds max
      let retries = 0;
      let finalModelUrl: string | null = null;

      while (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        retries++;

        const pollRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
          headers: {
            "Authorization": `Bearer ${tripoApiKey}`
          }
        });

        if (!pollRes.ok) {
          console.warn(`[API Generate] Tripo polling request failed (attempt ${retries}): ${pollRes.statusText}`);
          continue;
        }

        const pollData = await pollRes.json();
        if (pollData.code !== 0 || !pollData.data) {
          throw new Error(`Tripo polling returned error: ${pollData.message || "Unknown error"}`);
        }

        const status = pollData.data.status;
        console.log(`[API Generate] Tripo task ${taskId} status: ${status} (attempt ${retries})`);

        if (status === "success") {
          finalModelUrl = pollData.data.output?.pbr_model || pollData.data.result?.pbr_model?.url;
          break;
        }

        if (status === "failed" || status === "cancelled" || status === "banned") {
          throw new Error(`Tripo generation failed with status: ${status}`);
        }
      }

      if (!finalModelUrl) {
        throw new Error("Tripo generation timed out or returned no model URL.");
      }

      console.log(`[API Generate] Tripo model generated successfully: ${finalModelUrl}`);
      return finalModelUrl;
    };

    // Function to run local GPU generation via child process (TripoSR local)
    const runLocalGPU = async () => {
      console.log(`[API Generate] Initiating Local GPU pipeline`);
      
      const { spawn } = require("child_process");
      
      let localInputPath = "";
      let isTempInput = false;

      if (imagePath.startsWith("data:")) {
        localInputPath = path.join(os.tmpdir(), `toms3d-input-${Date.now()}.png`);
        await fs.writeFile(localInputPath, fileData);
        isTempInput = true;
      } else {
        if (imagePath.startsWith("/api/uploads/")) {
          const fname = imagePath.substring("/api/uploads/".length);
          localInputPath = path.join(os.tmpdir(), "toms3d-uploads", fname);
        } else {
          const relativeImagePath = imagePath.replace(/^\//, "");
          localInputPath = path.join(process.cwd(), "public", relativeImagePath);
        }
      }

      const localOutputPath = path.join(os.tmpdir(), `toms3d-output-${Date.now()}.glb`);

      console.log(`[API Generate] Local GPU input: ${localInputPath}`);
      console.log(`[API Generate] Local GPU output: ${localOutputPath}`);

      const scriptPath = path.join(process.cwd(), "scripts", "local_generate.py");

      return new Promise<string>((resolve, reject) => {
        // Run Python process in system environment
        const py = spawn("python", [scriptPath, localInputPath, localOutputPath]);
        let stdoutData = "";
        let stderrData = "";

        py.stdout.on("data", (data: any) => {
          stdoutData += data.toString();
        });

        py.stderr.on("data", (data: any) => {
          stderrData += data.toString();
        });

        py.on("close", async (code: number) => {
          if (isTempInput) {
            try { await fs.unlink(localInputPath); } catch {}
          }

          console.log(`[API Generate] Local GPU process exited with code ${code}`);
          if (code !== 0) {
            return reject(new Error(`Local generator process failed. Stderr: ${stderrData || "Check python setup"}`));
          }

          const lines = stdoutData.split("\n").filter(Boolean);
          let scriptError = "";
          let setupGuide = "";

          for (const line of lines) {
            try {
              const res = JSON.parse(line);
              if (res.status === "error") {
                scriptError = res.message;
                setupGuide = res.details;
              } else if (res.status === "progress") {
                console.log(`[API Generate] [Local GPU Progress] ${res.message}`);
              }
            } catch {
              // Ignore non-JSON output
            }
          }

          if (scriptError) {
            return reject(new Error(`${scriptError} Setup Guide: ${setupGuide || "None"}`));
          }

          try {
            await fs.access(localOutputPath);
            resolve(localOutputPath);
          } catch {
            reject(new Error("Local GPU generation finished but output GLB file is missing."));
          }
        });

        py.on("error", (err: any) => {
          reject(new Error(`Failed to start local Python process: ${err.message}`));
        });
      });
    };

    let selectedModel = modelType;
    let finalModelUrl: string;
    let fallbackTriggered = false;

    if (selectedModel === "local-gpu") {
      try {
        finalModelUrl = await runLocalGPU();
      } catch (err: any) {
        console.warn("[API Generate] Local GPU failed. Falling back to Tripo API. Error:", err.message);
        fallbackTriggered = true;
        selectedModel = "tripo-api";
        try {
          finalModelUrl = await runTripoAPI();
        } catch (subErr: any) {
          console.warn("[API Generate] Tripo API fallback failed. Falling back to Microsoft TRELLIS. Error:", subErr.message);
          selectedModel = "trellis";
          try {
            finalModelUrl = await runTrellis();
          } catch (thirdErr: any) {
            console.warn("[API Generate] Microsoft TRELLIS fallback failed. Falling back to Stable Fast 3D. Error:", thirdErr.message);
            selectedModel = "stable-fast-3d";
            try {
              finalModelUrl = await runStableFast3D();
            } catch (fourthErr: any) {
              console.warn("[API Generate] Stable Fast 3D fallback failed. Falling back to TripoSR. Error:", fourthErr.message);
              selectedModel = "triposr";
              finalModelUrl = await runTripoSR();
            }
          }
        }
      }
    } else if (selectedModel === "tripo-api") {
      try {
        finalModelUrl = await runTripoAPI();
      } catch (err: any) {
        console.warn("[API Generate] Tripo API failed. Falling back to Microsoft TRELLIS. Error:", err.message);
        fallbackTriggered = true;
        selectedModel = "trellis";
        try {
          finalModelUrl = await runTrellis();
        } catch (subErr: any) {
          console.warn("[API Generate] Microsoft TRELLIS fallback failed. Falling back to Stable Fast 3D. Error:", subErr.message);
          selectedModel = "stable-fast-3d";
          try {
            finalModelUrl = await runStableFast3D();
          } catch (thirdErr: any) {
            console.warn("[API Generate] Stable Fast 3D fallback failed. Falling back to TripoSR. Error:", thirdErr.message);
            selectedModel = "triposr";
            finalModelUrl = await runTripoSR();
          }
        }
      }
    } else if (selectedModel === "trellis") {
      try {
        finalModelUrl = await runTrellis();
      } catch (err: any) {
        console.warn("[API Generate] Microsoft TRELLIS failed. Falling back to Stable Fast 3D. Error:", err.message);
        fallbackTriggered = true;
        selectedModel = "stable-fast-3d";
        try {
          finalModelUrl = await runStableFast3D();
        } catch (subErr: any) {
          console.warn("[API Generate] Stable Fast 3D fallback failed. Falling back to TripoSR. Error:", subErr.message);
          selectedModel = "triposr";
          finalModelUrl = await runTripoSR();
        }
      }
    } else if (selectedModel === "stable-fast-3d") {
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

    // Serve model (Download from remote URL or read from local disk)
    let glbBuffer: ArrayBuffer;
    if (finalModelUrl.startsWith("http://") || finalModelUrl.startsWith("https://")) {
      console.log(`[API Generate] Downloading final model from ${finalModelUrl}`);
      const downloadRes = await fetch(finalModelUrl);
      if (!downloadRes.ok) {
        throw new Error(`Failed to download model from ${finalModelUrl}: ${downloadRes.statusText}`);
      }
      glbBuffer = await downloadRes.arrayBuffer();
    } else {
      console.log(`[API Generate] Reading local generated model from disk: ${finalModelUrl}`);
      const fileBuffer = await fs.readFile(finalModelUrl);
      glbBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
      // Cleanup local temp GLB file
      try {
        await fs.unlink(finalModelUrl);
      } catch {}
    }
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
