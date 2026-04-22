import { KNOWLEDGE_BASE } from "../data/knowledge-base.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-4.1-mini";

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreChunk(question, chunk) {
  const normalizedQuestion = normalize(question);
  const normalizedChunk = normalize(`${chunk.title} ${chunk.content}`);
  const terms = normalizedQuestion.split(" ").filter((term) => term.length > 2);

  let score = 0;

  for (const term of terms) {
    if (normalizedChunk.includes(term)) {
      score += term.length > 6 ? 3 : 2;
    }
  }

  if (normalizedChunk.includes(normalizedQuestion)) {
    score += 6;
  }

  return score;
}

function retrieveContext(question) {
  return KNOWLEDGE_BASE.map((chunk) => ({
    ...chunk,
    score: scoreChunk(question, chunk),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .filter((chunk) => chunk.score > 0);
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error:
            "Missing OPENAI_API_KEY. Add it in your Vercel project settings before using chat.",
        },
        { status: 500 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const message = body?.message?.trim();

    if (!message) {
      return Response.json({ error: "Message is required." }, { status: 400 });
    }

    const contextChunks = retrieveContext(message);
    const contextText =
      contextChunks.length > 0
        ? contextChunks
            .map(
              (chunk) =>
                `[${chunk.title}]\n${chunk.content}`
            )
            .join("\n\n")
        : "No highly relevant context was retrieved from the site knowledge base.";

    const instructions =
      "You are an assistant for Ryan Blake's personal website. Answer only from the supplied context when possible. Be concise, helpful, and specific. If the answer is not supported by the context, say that you do not have enough information and suggest contacting Ryan directly at hello@ryanblake.com. Do not invent clients, projects, timelines, or credentials.";

    const upstream = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Website knowledge base context:\n\n${contextText}\n\nUser question: ${message}`,
              },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return Response.json(
        {
          error: "The AI response request failed.",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const result = await upstream.json();
    const answer = result.output_text?.trim();

    if (!answer) {
      return Response.json(
        { error: "The AI response came back empty." },
        { status: 500 }
      );
    }

    return Response.json({
      answer,
      sources: contextChunks.map((chunk) => chunk.title),
    });
  },
};
