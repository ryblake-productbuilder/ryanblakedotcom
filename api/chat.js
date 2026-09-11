import { KNOWLEDGE_BASE } from "../data/knowledge-base.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-4.1-mini";
const SITE_TIME_ZONE = "America/Detroit";

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

function getCurrentDateContext() {
  const now = new Date();

  return {
    title: "Current date",
    content: `Today's date is ${new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: SITE_TIME_ZONE,
    }).format(now)} in the ${SITE_TIME_ZONE} time zone.`,
  };
}

function asksAboutCurrentDateOrTime(question) {
  return /\b(today|current date|what date|date today|current time|what time|time now|right now)\b/i.test(
    question
  );
}

function extractResponseText(result) {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const textParts = [];

  for (const outputItem of result.output || []) {
    for (const contentItem of outputItem.content || []) {
      if (typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join("\n").trim();
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

    const dateContext = getCurrentDateContext();
    const includeDateContext = asksAboutCurrentDateOrTime(message);
    const contextChunks = retrieveContext(message);
    const suppliedContextChunks = includeDateContext
      ? [dateContext, ...contextChunks]
      : contextChunks;
    const contextText =
      suppliedContextChunks.length > 0
        ? suppliedContextChunks
            .map(
              (chunk) =>
                `[${chunk.title}]\n${chunk.content}`
            )
            .join("\n\n")
        : "No highly relevant context was retrieved from the site knowledge base.";

    const instructions =
      "You are an assistant for Ryan Blake's personal website. Answer only from the supplied context when possible. Be concise, helpful, and specific. Use the supplied current date context for questions about today, current time, or relative dates. If the answer is not supported by the context, say that you do not have enough information and suggest contacting Ryan directly at hello@ryanblake.com. Do not invent dates, clients, projects, timelines, or credentials.";

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
    const answer = extractResponseText(result);

    if (!answer) {
      return Response.json(
        {
          error: "The AI response came back empty.",
          details: {
            id: result.id,
            status: result.status,
            outputTypes: (result.output || []).map((item) => item.type),
          },
        },
        { status: 500 }
      );
    }

    return Response.json({
      answer,
      sources: suppliedContextChunks.map((chunk) => chunk.title),
    });
  },
};
