const instructions = `
Explain content in plain language for ages 13+.

Return VALID JSON ONLY with these keys:
- authenticity (string)
- summary (string)
- observed (array of strings)
- potential_concerns (array of strings)
- alternative_interpretations (array of strings)
- suggested_checks (array of strings)

Consider racism, religious hatred, antisemitism, bullying,
harassment, stereotypes, satire, cultural context and counterspeech.

Distinguish harmful content from jokes, quotations, education,
criticism and respectful disagreement.

Separate observations from speculation.
Do not identify people from faces or infer sensitive traits.
Never claim that media is a proven deepfake without reliable evidence.
Do not invent dialogue, audio content or timestamps.

An AI assessment is not an independent fact-check.
`;

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function youtubeURL(value) {
  const u = new URL(value);

  if (u.protocol !== "https:") {
    throw new Error("Use a public HTTPS YouTube link.");
  }

  const host = u.hostname.toLowerCase();
  let id;

  if (host === "youtu.be" || host === "www.youtu.be") {
    id = u.pathname.slice(1).split("/")[0];
  } else if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com"
  ) {
    if (u.pathname === "/watch") {
      id = u.searchParams.get("v");
    } else if (/^\/(shorts|live)\//.test(u.pathname)) {
      id = u.pathname.split("/")[2];
    }
  }

  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error("Enter a valid public YouTube video link.");
  }

  return `https://www.youtube.com/watch?v=${id}`;
}

function addImage(parts, data, type) {
  if (!allowedImageTypes.has(type) || typeof data !== "string") {
    throw new Error("Unsupported image.");
  }

  const match = data.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/
  );

  if (
    !match ||
    match[2].length > 8500000 ||
    `image/${match[1]}` !== type
  ) {
    throw new Error("Invalid or oversized image.");
  }

  parts.push({
    inline_data: {
      mime_type: type,
      data: match[2]
    }
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST required."
    });
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(503).json({
      error: "GEMINI_API_KEY is missing in Vercel settings."
    });
  }

  try {
    const body = req.body || {};

    const text = String(body.text || "").slice(0, 12000);
    const context = String(body.context || "").slice(0, 1500);
    const rawLink = String(body.videoUrl || "").trim().slice(0, 1500);
    const media = body.media || null;

    if (!text && !rawLink && !media) {
      return res.status(400).json({
        error: "Add text, an image, a video, or a YouTube link."
      });
    }

    let link = "";

    if (rawLink) {
      link = youtubeURL(rawLink);
    }

    const parts = [
      {
        text: `
User text: ${text || "(none)"}
Background: ${context || "(none)"}

Explain what is visible and, for an accessible YouTube video,
what is audible. Do not claim independent fact-checking.
`
      }
    ];

    if (link) {
      parts.push({
        file_data: {
          file_uri: link
        }
      });
    }

    if (media) {
      if (media.kind === "image") {
        addImage(parts, media.data, media.type);
      } else if (media.kind === "video") {
        if (
          !["video/mp4", "video/webm"].includes(media.type) ||
          !Array.isArray(media.frames) ||
          media.frames.length !== 3
        ) {
          return res.status(400).json({
            error: "Expected three video frames."
          });
        }

        parts.push({
          text: `
These are three sampled still frames from an uploaded video.
No audio was provided for this upload.
`
        });

        media.frames.forEach((frame) => {
          addImage(parts, frame, "image/jpeg");
        });
      } else {
        return res.status(400).json({
          error: "Unsupported media."
        });
      }
    }

    const model =
      process.env.RESO_GEMINI_MODEL || "gemini-3.8-flash";

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 20000);

    let response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "x-goog-api-key": key,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: instructions
                }
              ]
            },
            contents: [
              {
                role: "user",
                parts
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
              maxOutputTokens: 1800
            }
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = String(result?.error?.message || "").slice(0, 350);

        if (response.status === 429) {
          return res.status(429).json({
            error: "Gemini quota reached. Please try again later."
          });
        }

        if (
          link &&
          [400, 403, 404, 422].includes(response.status)
        ) {
          return res.status(422).json({
            error:
              "Gemini could not access or process this YouTube video. " +
              "Check that it is public and supported."
          });
        }

        return res.status(502).json({
          error:
            `Gemini request failed (${response.status}). ` +
            msg.replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]")
        });
      }

      const raw = (result.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || "")
        .join("\n")
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, "");

      if (!raw) {
        return res.status(502).json({
          error: "Gemini returned no analysis."
        });
      }

      let report;

      try {
        report = JSON.parse(raw);
      } catch {
        report = {
          summary: raw
        };
      }

      return res.status(200).json({
        report,
        analysis_scope: link
          ? "YouTube video: visuals and audio, if accessible"
          : media?.kind === "video"
          ? "Uploaded video: sampled frames only"
          : media?.kind === "image"
          ? "Uploaded image"
          : "Text only"
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    if (
      e.name === "AbortError" ||
      e.name === "TimeoutError"
    ) {
      return res.status(504).json({
        error:
          "AI analysis took too long. Please try a smaller image " +
          "or retry later."
      });
    }

    console.error("AI analysis failed:", e);

    return res.status(500).json({
      error: "AI analysis failed. Please try again."
    });
  }
}
