import { type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system:
      "You are a recipe parser. Extract ingredients from recipes and return structured JSON only — no prose, no markdown.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: `Extract every ingredient from this recipe.

Return ONLY this JSON shape, nothing else:
{"ingredients":[{"name":"<lowercase ingredient name>","amount":<number>,"unit":"<unit>"}]}

Rules:
- name: singular lowercase (e.g. "egg", "flour", "olive oil")
- amount: numeric value only
- unit: standard unit (g, kg, ml, L, tsp, tbsp, cup, piece). Use "piece" when no unit is given.
- If quantity is unclear, use 1.`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  try {
    // Strip any accidental markdown fences
    const clean = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
    const parsed = JSON.parse(clean);
    return Response.json(parsed);
  } catch {
    return Response.json(
      { error: "Claude could not extract a recipe from this PDF." },
      { status: 422 }
    );
  }
}
