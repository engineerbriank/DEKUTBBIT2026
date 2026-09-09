const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

export type GatewayItem = {
  role: "user" | "assistant" | "system" | "developer";
  content: Array<{ type: "input_text" | "output_text"; text: string }>;
};

export function userItem(text: string): GatewayItem {
  return { role: "user", content: [{ type: "input_text", text }] };
}

export function assistantItem(text: string): GatewayItem {
  return { role: "assistant", content: [{ type: "output_text", text }] };
}

type GatewayOptions = {
  instructions?: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
};

/**
 * Calls the Lovable AI Gateway Responses API with streaming (required for
 * reasoning models) and returns the accumulated final text.
 */
export async function callGateway(input: GatewayItem[], options: GatewayOptions = {}) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured yet. Missing LOVABLE_API_KEY.");

  const body: Record<string, unknown> = {
    model: MODEL,
    input,
    stream: true,
    store: false,
    reasoning: { effort: "low" },
  };
  if (options.instructions) body["instructions"] = options.instructions;
  if (options.jsonSchema) {
    body["text"] = {
      format: {
        type: "json_schema",
        name: options.jsonSchema.name,
        strict: true,
        schema: options.jsonSchema.schema,
      },
    };
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("The AI service is busy right now. Please try again in a moment.");
    }
    if (res.status === 402) {
      throw new Error("AI credits have run out. Please top up in Lovable to keep using AI.");
    }
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed" && !text) {
          text = event.response?.output_text ?? "";
        }
      } catch {
        // ignore malformed keep-alive chunks
      }
    }
  }

  return text.trim();
}
