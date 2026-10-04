const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async (request) => {
  const origin = request.headers.get("origin") || "*";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin)
    });
  }

  if (request.method !== "POST") {
    return json({ error: { message: "Method not allowed. Use POST." } }, 405, origin);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    return json({ error: { message: "Missing Gemini API key." } }, 401, origin);
  }

  const apiKey = authorization.slice(7).trim();
  if (!apiKey) return json({ error: { message: "Missing Gemini API key." } }, 401, origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: { message: "Invalid JSON request." } }, 400, origin);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const systemMessages = messages.filter(m => m?.role === "system").map(m => m.content).filter(Boolean);
  const conversation = messages
    .filter(m => m?.role !== "system")
    .map(m => ({
      role: m?.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? "") }]
    }));

  if (!conversation.length) {
    return json({ error: { message: "No user message supplied." } }, 400, origin);
  }

  const geminiBody = {
    system_instruction: systemMessages.length
      ? { parts: [{ text: systemMessages.join("\n\n") }] }
      : undefined,
    contents: conversation,
    generationConfig: {
      temperature: typeof body.temperature === "number" ? body.temperature : 0.25,
      maxOutputTokens: typeof body.max_tokens === "number" ? body.max_tokens : 3000
    }
  };

  if (body.response_format?.type === "json_object") {
    geminiBody.generationConfig.responseMimeType = "application/json";
  }

  // Remove undefined fields before sending.
  if (!geminiBody.system_instruction) delete geminiBody.system_instruction;

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(geminiBody)
    });

    const upstreamText = await upstream.text();
    if (!upstream.ok) {
      let message = `Gemini request failed (${upstream.status})`;
      try {
        const x = JSON.parse(upstreamText);
        message = x?.error?.message || message;
      } catch {}
      return json({ error: { message, status: upstream.status } }, upstream.status, origin);
    }

    let data;
    try {
      data = JSON.parse(upstreamText);
    } catch {
      return json({ error: { message: "Gemini returned an invalid response." } }, 502, origin);
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    const finishReason = data?.candidates?.[0]?.finishReason || "STOP";

    // Return an OpenAI-compatible shape so the existing StudyForge frontend remains stable.
    return json({
      choices: [{
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: finishReason.toLowerCase()
      }],
      model: GEMINI_MODEL
    }, 200, origin);
  } catch {
    return json({ error: { message: "Could not reach Gemini from the proxy." } }, 502, origin);
  }
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      "Cache-Control": "no-store"
    }
  });
}
