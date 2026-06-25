import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// ==========================
// START NEW FEATURE - Endpoints
// ==========================

// Helper function to handle fallback and retry on high demand/errors
async function generateContentWithFallback(params: {
  model?: string;
  contents: string;
  config?: any;
}) {
  const modelsToTry = [
    params.model || "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-flash"
  ];

  const maxRetriesPerModel = 2;
  const initialDelayMs = 1000;
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`Generating content with model: ${model} (attempt ${attempt}/${maxRetriesPerModel})...`);
        return await ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        });
      } catch (error: any) {
        lastError = error;
        console.warn(`Model ${model} failed on attempt ${attempt}. Error:`, error.message || error);
        
        const isTransient = error.status === 503 || 
                            error.statusCode === 503 ||
                            error.message?.includes('503') || 
                            error.message?.includes('high demand') ||
                            error.message?.includes('UNAVAILABLE') ||
                            error.message?.includes('429') ||
                            error.message?.includes('exhausted') ||
                            error.message?.includes('limit');

        if (isTransient && attempt < maxRetriesPerModel) {
          const delay = initialDelayMs * Math.pow(2, attempt);
          console.warn(`Transient error detected (503/429/Unavailable). Backing off for ${delay}ms...`);
          await sleep(delay);
        } else {
          break; // Break retry loop to proceed to next fallback model
        }
      }
    }
    console.warn(`Model ${model} failed or exhausted. Trying next fallback model if available...`);
  }

  throw lastError || new Error("All available Gemini models exhausted.");
}

// 1. Analyze Emails and Calendar Events
app.post("/api/analyze", async (req, res) => {
  try {
    const { emails, calendarEvents } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: "Invalid emails list" });
    }

    const emailText = emails.map((e: any, i: number) =>
      `Email ${i+1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nPreview: ${e.snippet}`
    ).join('\n\n');

    const calendarText = calendarEvents && calendarEvents.length > 0
      ? calendarEvents.map((ev: any, i: number) =>
          `Event ${i+1}:\nSummary: ${ev.summary}\nStart: ${ev.start?.dateTime || ev.start?.date}\nEnd: ${ev.end?.dateTime || ev.end?.date}\nLocation: ${ev.location || 'N/A'}`
        ).join('\n\n')
      : "No calendar events today.";

    const prompt = `You are DayBriefing, an AI chief of staff for a working professional.

Analyze these unread emails AND today's calendar schedule to create a prioritized daily brief. Consider the calendar context (e.g. if they have back-to-back meetings, indicate if they should do a task before/after a meeting or if there's high urgency).

TODAY'S CALENDAR SCHEDULE:
${calendarText}

EMAILS:
${emailText}

Respond in this exact JSON format:
{
  "summary": "2-3 sentence overview of what needs attention today and why, taking both unread emails and today's calendar schedule into account",
  "tasks": [
    {
      "title": "Short action title",
      "priority": "urgent|high|medium|low",
      "context": "Why this matters, what happens if ignored, and any scheduling context (e.g., 'Take care of this before your 10:00 AM Sync')",
      "action": "Exact specific next step to take right now"
    }
  ]
}

Rules:
- Maximum 7 tasks
- Order by priority (urgent first)
- Be specific, not generic
- Focus on what requires action, ignore newsletters/promotions
- If no action needed for an email, skip it
- Return only valid JSON, nothing else`;

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }
    const result = JSON.parse(jsonMatch[0]);
    res.json(result);

  } catch (error: any) {
    console.error("Analyze Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze briefing" });
  }
});

// 2. Draft Reply
app.post("/api/draft", async (req, res) => {
  try {
    const { from, subject, snippet } = req.body;

    const prompt = `Write a short, professional email reply to this email.

From: ${from}
Subject: ${subject}
Preview: ${snippet}

Rules:
- Keep it under 120 words
- Be professional and helpful
- Do not include subject line
- Start directly with the body
- End with "Best regards"
- Return only the email body text, nothing else`;

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ draft: response.text?.trim() || "" });

  } catch (error: any) {
    console.error("Draft Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate draft" });
  }
});

// 3. Follow-Up Assistant Recommendations
app.post("/api/followup", async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: "Invalid emails list for follow-up detection" });
    }

    const emailText = emails.map((e: any, i: number) =>
      `Email ${i+1}:\nThread ID: ${e.threadId}\nFrom: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nPreview: ${e.snippet}`
    ).join('\n\n');

    const prompt = `You are a Smart Follow-Up Assistant.
Analyze these emails, which are older than 3 days and have not been replied to.
For each email, evaluate if it requires a follow-up (ignore newsletters, automated alerts, spam, out-of-office, and notifications).
Only select emails that represent active conversations, client questions, team deliverables, or follow-up items.

Respond in this exact JSON format:
{
  "followUps": [
    {
      "threadId": "The exact threadId of the email",
      "from": "Sender details",
      "subject": "The subject line",
      "date": "The date",
      "snippet": "The email snippet",
      "recommendation": "Suggest follow up action (e.g. 'Ask for progress update', 'Submit requested document')",
      "reason": "Why follow up is needed (e.g. 'No response from recipient in 4 days')"
    }
  ]
}

If no emails require follow-up, return:
{
  "followUps": []
}`;

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }
    const result = JSON.parse(jsonMatch[0]);
    res.json(result);

  } catch (error: any) {
    console.error("FollowUp Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate follow-up recommendations" });
  }
});

// ==========================
// END NEW FEATURE - Endpoints
// ==========================

// Vite and Static assets handler
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite();
