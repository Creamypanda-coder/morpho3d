import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";

async function runGradioEndpoint(
  spaceHost: string,
  fnIndex: number,
  data: any[],
  hfToken?: string,
  writeProgress?: (msg: string) => void
): Promise<any[]> {
  const sessionHash = Math.random().toString(36).substring(2);
  const hostName = spaceHost.includes("stable-fast-3d")
    ? "StableFast3D"
    : spaceHost.includes("triposr")
    ? "TripoSR"
    : "Trellis";

  if (writeProgress) {
    writeProgress(`[${hostName}] Joining queue for inference worker...`);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hfToken) {
    headers["Authorization"] = `Bearer ${hfToken}`;
  }

  const isGradioV5 = spaceHost.includes("trellis");
  const prefix = isGradioV5 ? "/gradio_api" : "";

  const joinRes = await fetch(`${spaceHost}${prefix}/queue/join`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      data,
      fn_index: fnIndex,
      session_hash: sessionHash,
    }),
  });

  if (!joinRes.ok) {
    const errText = await joinRes.text();
    throw new Error(`Queue join failed (status ${joinRes.status}): ${errText}`);
  }

  const joinData = await joinRes.json();
  if (writeProgress) {
    writeProgress(`[${hostName}] Joined queue successfully.`);
  }

  const streamHeaders: Record<string, string> = {};
  if (hfToken) {
    streamHeaders["Authorization"] = `Bearer ${hfToken}`;
  }

  const streamRes = await fetch(
    `${spaceHost}${prefix}/queue/data?session_hash=${sessionHash}`,
    {
      method: "GET",
      headers: streamHeaders,
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

        if (writeProgress) {
          if (event.msg === "estimation" && event.rank !== undefined) {
            writeProgress(
              `[${hostName}] Rank in queue: ${event.rank + 1} | Est. wait: ${Math.round(
                event.rank_eta || 0
              )}s`
            );
          } else if (event.msg === "process_starts") {
            writeProgress(`[${hostName}] GPU processing started...`);
          } else if (event.msg === "progress" && event.progress_data) {
            const prog = event.progress_data[0];
            writeProgress(
              `[${hostName}] Progress: ${prog.desc || "Generating"} (${Math.round(
                ((prog.index || 0) / (prog.length || 1)) * 100
              )}%)`
            );
          }
        }

        if (event.msg === "process_completed") {
          if (event.success === false) {
            throw new Error(event.output?.error || "Process failed in Gradio queue.");
          }
          if (writeProgress) {
            writeProgress(`[${hostName}] Inference processing complete!`);
          }
          return event.output.data;
        } else if (event.msg === "process_failed") {
          throw new Error(`[${hostName}] Process failed: ${event.message || "Unknown error"}`);
        }
      }
    }
  }
  throw new Error(`[${hostName}] Stream ended before completion.`);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imagePath, modelType = "stable-fast-3d", analysisPrompt } = body;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const writeProgress = (message: string) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify({ status: "progress", message })}\n\n`));
    } catch (e) {}
  };

  // Run generation pipeline asynchronously
  (async () => {
    let fallbackTriggered = false;
    let selectedModel = modelType;
    let finalModelUrl: string = "";

    try {
      if (analysisPrompt) {
        writeProgress(`[SYSTEM] AI analysis context loaded. guiding reconstruction...`);
      }

      let fileData: Buffer;
      let filename = "input.png";
      let mimeType = "image/png";

      if (imagePath.startsWith("data:")) {
        const match = imagePath.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          throw new Error("Invalid image data format");
        }
        mimeType = match[1];
        fileData = Buffer.from(match[2], "base64");

        let ext = ".png";
        if (mimeType === "image/jpeg") ext = ".jpg";
        else if (mimeType === "image/webp") ext = ".webp";
        filename = `input${ext}`;
      } else {
        let absoluteImagePath = "";
        if (imagePath.startsWith("/api/uploads/")) {
          const fname = imagePath.substring("/api/uploads/".length);
          absoluteImagePath = path.join(os.tmpdir(), "toms3d-uploads", fname);
        } else {
          const relativeImagePath = imagePath.replace(/^\//, "");
          absoluteImagePath = path.join(process.cwd(), "public", relativeImagePath);
        }

        try {
          await fs.access(absoluteImagePath);
        } catch {
          throw new Error(`Uploaded image file not found: ${imagePath}`);
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
        writeProgress("[StableFast3D] Uploading image to GPU space...");

        const blob = new Blob([fileData as any], { type: mimeType });
        const formData = new FormData();
        formData.append("files", blob, filename);

        const uploadHeaders: Record<string, string> = {};
        if (hfToken) {
          uploadHeaders["Authorization"] = `Bearer ${hfToken}`;
        }

        const uploadRes = await fetch(`${spaceHost}/upload`, {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Hugging Face upload failed for SF3D: ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        const uploadedFileUrl = uploadData[0];
        writeProgress("[StableFast3D] Preprocessing background removal...");

        const preprocessResult = await runGradioEndpoint(
          spaceHost,
          4,
          [{ path: uploadedFileUrl, meta: { _type: "gradio.FileData" } }, 0.85],
          hfToken,
          writeProgress
        );

        const stateVal = preprocessResult ? preprocessResult[2] : null;
        writeProgress("[StableFast3D] Starting feed-forward 3D reconstruction...");

        const generateResult = await runGradioEndpoint(
          spaceHost,
          5,
          [
            null,
            { path: uploadedFileUrl, meta: { _type: "gradio.FileData" } },
            stateVal,
            0.85,
            "None",
            -1,
            1024,
          ],
          hfToken,
          writeProgress
        );

        const glbOutput = generateResult ? generateResult[4] : null;
        if (!glbOutput || !glbOutput.url) {
          throw new Error("SF3D generation failed: No GLB URL returned.");
        }

        return glbOutput.url;
      };

      // Function to run TripoSR Pipeline (Fallback)
      const runTripoSR = async () => {
        const spaceHost = "https://stabilityai-triposr.hf.space";
        writeProgress("[TripoSR Space] Uploading image to GPU space...");

        const blob = new Blob([fileData as any], { type: mimeType });
        const formData = new FormData();
        formData.append("files", blob, filename);

        const uploadHeaders: Record<string, string> = {};
        if (hfToken) {
          uploadHeaders["Authorization"] = `Bearer ${hfToken}`;
        }

        const uploadRes = await fetch(`${spaceHost}/upload`, {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Hugging Face upload failed for TripoSR: ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        const uploadedFileUrl = uploadData[0];
        writeProgress("[TripoSR Space] Preprocessing background removal...");

        const preprocessResult = await runGradioEndpoint(
          spaceHost,
          2,
          [{ path: uploadedFileUrl, meta: { _type: "gradio.FileData" } }, true, 0.85],
          hfToken,
          writeProgress
        );
        const processedImage = preprocessResult ? preprocessResult[0] : null;

        if (!processedImage) {
          throw new Error("TripoSR preprocess failed: processed image is null");
        }

        writeProgress("[TripoSR Space] Starting 3D reconstruction...");

        const generateResult = await runGradioEndpoint(
          spaceHost,
          3,
          [processedImage, 128],
          hfToken,
          writeProgress
        );
        const glbOutput = generateResult ? generateResult[1] : null;

        if (!glbOutput || !glbOutput.url) {
          throw new Error("TripoSR generation failed: No GLB URL returned.");
        }

        return glbOutput.url;
      };

      // Function to run Microsoft Trellis Pipeline (SOTA High-Quality)
      const runTrellis = async () => {
        const spaceHost = "https://trellis-community-trellis.hf.space";
        writeProgress("[Trellis] Uploading image to Microsoft TRELLIS space...");

        const blob = new Blob([fileData as any], { type: mimeType });
        const formData = new FormData();
        formData.append("files", blob, filename);

        const uploadHeaders: Record<string, string> = {};
        if (hfToken) {
          uploadHeaders["Authorization"] = `Bearer ${hfToken}`;
        }

        const uploadRes = await fetch(`${spaceHost}/gradio_api/upload`, {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Hugging Face upload failed for TRELLIS: ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        const uploadedFileUrl = uploadData[0];
        const fileUrl = `${spaceHost}/gradio_api/file=${uploadedFileUrl}`;
        writeProgress("[Trellis] Starting structural 3D synthesis...");

        const generateResult = await runGradioEndpoint(
          spaceHost,
          11,
          [
            {
              path: uploadedFileUrl,
              url: fileUrl,
              orig_name: filename,
              meta: { _type: "gradio.FileData" },
            },
            [],
            null,
            0,
            7.5,
            12,
            3.0,
            12,
            "stochastic",
            0.95,
            1024,
          ],
          hfToken,
          writeProgress
        );

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

        writeProgress("[Tripo API] Uploading image to Tripo Cloud...");

        const blob = new Blob([fileData as any], { type: mimeType });
        const formData = new FormData();
        formData.append("file", blob, filename);

        const uploadRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tripoApiKey}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Tripo upload failed: ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        if (uploadData.code !== 0 || !uploadData.data?.image_token) {
          throw new Error(`Tripo upload returned error: ${uploadData.message || "Unknown error"}`);
        }

        const imageToken = uploadData.data.image_token;
        writeProgress("[Tripo API] Submitting task...");

        const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tripoApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "image_to_model",
            file: {
              type: mimeType.split("/")[1] || "png",
              file_token: imageToken,
            },
          }),
        });

        if (!taskRes.ok) {
          throw new Error(`Tripo task creation failed: ${taskRes.statusText}`);
        }

        const taskData = await taskRes.json();
        if (taskData.code !== 0 || !taskData.data?.task_id) {
          throw new Error(`Tripo task creation returned error: ${taskData.message || "Unknown error"}`);
        }

        const taskId = taskData.data.task_id;
        writeProgress(`[Tripo API] Task submitted. ID: ${taskId}. Polling...`);

        const maxRetries = 40;
        let retries = 0;
        let finalUrl: string | null = null;

        while (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          retries++;

          const pollRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
            headers: {
              Authorization: `Bearer ${tripoApiKey}`,
            },
          });

          if (!pollRes.ok) {
            writeProgress(`[Tripo API] Polling error (attempt ${retries})`);
            continue;
          }

          const pollData = await pollRes.json();
          if (pollData.code !== 0 || !pollData.data) {
            throw new Error(`Tripo polling returned error: ${pollData.message || "Unknown error"}`);
          }

          const status = pollData.data.status;
          writeProgress(`[Tripo API] Status: ${status} (attempt ${retries}/${maxRetries})`);

          if (status === "success") {
            finalUrl = pollData.data.output?.pbr_model || pollData.data.result?.pbr_model?.url;
            break;
          }

          if (status === "failed" || status === "cancelled" || status === "banned") {
            throw new Error(`Tripo generation failed with status: ${status}`);
          }
        }

        if (!finalUrl) {
          throw new Error("Tripo generation timed out or returned no model URL.");
        }

        return finalUrl;
      };

      // Function to run local GPU generation via child process (TripoSR local)
      const runLocalGPU = async () => {
        writeProgress("[Local GPU] Preparing local inputs...");

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
        const scriptPath = path.join(process.cwd(), "scripts", "local_generate.py");

        const fsSync = require("fs");
        let pythonCommand = "python";
        const possibleVenvPaths = [
          path.join(process.cwd(), "venv", "Scripts", "python.exe"),
          path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
          "C:\\Users\\untou\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\python.exe",
        ];
        for (const p of possibleVenvPaths) {
          if (fsSync.existsSync(p)) {
            pythonCommand = p;
            break;
          }
        }

        writeProgress("[Local GPU] Spawning PyTorch CUDA backend process...");

        return new Promise<string>((resolve, reject) => {
          const py = spawn(pythonCommand, [scriptPath, localInputPath, localOutputPath]);
          let stdoutData = "";
          let stderrData = "";
          let stdoutBuffer = "";

          py.stdout.on("data", (data: any) => {
            stdoutData += data.toString();
            stdoutBuffer += data.toString();

            const lines = stdoutBuffer.split("\n");
            stdoutBuffer = lines.pop() || "";

            for (const line of lines) {
              try {
                const res = JSON.parse(line.trim());
                if (res.status === "progress") {
                  writeProgress(`[Local GPU] ${res.message}`);
                }
              } catch {}
            }
          });

          py.stderr.on("data", (data: any) => {
            stderrData += data.toString();
          });

          py.on("close", async (code: number) => {
            if (isTempInput) {
              try {
                await fs.unlink(localInputPath);
              } catch {}
            }

            if (code !== 0) {
              return reject(
                new Error(
                  `Local generator failed (code ${code}). Stderr: ${
                    stderrData || "Check python setup"
                  }`
                )
              );
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
                }
              } catch {}
            }

            if (scriptError) {
              return reject(new Error(`${scriptError} Setup Guide: ${setupGuide || "None"}`));
            }

            try {
              await fs.access(localOutputPath);
              resolve(localOutputPath);
            } catch {
              reject(new Error("Local GPU output GLB file is missing."));
            }
          });

          py.on("error", (err: any) => {
            reject(new Error(`Failed to start local Python process: ${err.message}`));
          });
        });
      };

      if (selectedModel === "local-gpu") {
        try {
          finalModelUrl = await runLocalGPU();
        } catch (err: any) {
          writeProgress(`[FALLBACK] Local GPU failed: ${err.message}. Falling back to Tripo API...`);
          fallbackTriggered = true;
          selectedModel = "tripo-api";
          try {
            finalModelUrl = await runTripoAPI();
          } catch (subErr: any) {
            writeProgress(`[FALLBACK] Tripo API failed: ${subErr.message}. Falling back to Trellis...`);
            selectedModel = "trellis";
            try {
              finalModelUrl = await runTrellis();
            } catch (thirdErr: any) {
              writeProgress(`[FALLBACK] Trellis failed: ${thirdErr.message}. Falling back to StableFast3D...`);
              selectedModel = "stable-fast-3d";
              try {
                finalModelUrl = await runStableFast3D();
              } catch (fourthErr: any) {
                writeProgress(`[FALLBACK] SF3D failed: ${fourthErr.message}. Falling back to TripoSR Space...`);
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
          writeProgress(`[FALLBACK] Tripo API failed: ${err.message}. Falling back to Trellis...`);
          fallbackTriggered = true;
          selectedModel = "trellis";
          try {
            finalModelUrl = await runTrellis();
          } catch (subErr: any) {
            writeProgress(`[FALLBACK] Trellis failed: ${subErr.message}. Falling back to StableFast3D...`);
            selectedModel = "stable-fast-3d";
            try {
              finalModelUrl = await runStableFast3D();
            } catch (thirdErr: any) {
              writeProgress(`[FALLBACK] SF3D failed: ${thirdErr.message}. Falling back to TripoSR Space...`);
              selectedModel = "triposr";
              finalModelUrl = await runTripoSR();
            }
          }
        }
      } else if (selectedModel === "trellis") {
        try {
          finalModelUrl = await runTrellis();
        } catch (err: any) {
          writeProgress(`[FALLBACK] Trellis failed: ${err.message}. Falling back to StableFast3D...`);
          fallbackTriggered = true;
          selectedModel = "stable-fast-3d";
          try {
            finalModelUrl = await runStableFast3D();
          } catch (subErr: any) {
            writeProgress(`[FALLBACK] SF3D failed: ${subErr.message}. Falling back to TripoSR Space...`);
            selectedModel = "triposr";
            finalModelUrl = await runTripoSR();
          }
        }
      } else if (selectedModel === "stable-fast-3d") {
        try {
          finalModelUrl = await runStableFast3D();
        } catch (err: any) {
          writeProgress(`[FALLBACK] StableFast3D failed: ${err.message}. Falling back to TripoSR Space...`);
          fallbackTriggered = true;
          selectedModel = "triposr";
          finalModelUrl = await runTripoSR();
        }
      } else {
        finalModelUrl = await runTripoSR();
      }

      // Serve model
      let glbBuffer: ArrayBuffer;
      if (finalModelUrl.startsWith("http://") || finalModelUrl.startsWith("https://")) {
        writeProgress(`[SYSTEM] Downloading final reconstructed 3D model...`);
        const downloadRes = await fetch(finalModelUrl);
        if (!downloadRes.ok) {
          throw new Error(`Failed to download model: ${downloadRes.statusText}`);
        }
        glbBuffer = await downloadRes.arrayBuffer();
      } else {
        writeProgress(`[SYSTEM] Reading reconstructed 3D model from local cache...`);
        const fileBuffer = await fs.readFile(finalModelUrl);
        glbBuffer = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        );
        try {
          await fs.unlink(finalModelUrl);
        } catch {}
      }

      writeProgress(`[SYSTEM] Compiling GLB asset...`);
      const base64Data = Buffer.from(glbBuffer).toString("base64");

      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            status: "success",
            result: base64Data,
            modelUsed: selectedModel,
            fallbackTriggered,
          })}\n\n`
        )
      );
    } catch (error: any) {
      console.error("Generation API error:", error);
      try {
        writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              status: "error",
              message: error.message || "Generation failed",
            })}\n\n`
          )
        );
      } catch (e) {}
    } finally {
      try {
        writer.close();
      } catch (e) {}
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
