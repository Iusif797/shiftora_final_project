import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export interface InsightsMetrics {
  avgHoursPerEmployee: number;
  attendanceRate: number;
  totalAnomalies: number;
  activeEmployees: number;
  avgCheckinTime: number;
  totalHoursWorked: number;
  unresolvedAnomalies: number;
  incompleteCheckouts: number;
  inactiveStaffCount: number;
}

const TrendSchema = z.object({
  type: z.string().min(1).default("info"),
  title: z.string().min(1).default("Trend"),
  description: z.string().min(1).default("No details"),
  severity: z.enum(["info", "warning", "success"]).default("info"),
});

const RecommendationSchema = z.object({
  id: z.string().min(1).default("rec-1"),
  title: z.string().min(1).default("Recommendation"),
  action: z.string().min(1).default("Review operations"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

const ChallengeSchema = z.object({
  challenge: z.string().min(1).default("Unknown"),
  likelihood: z.string().min(1).default("low"),
  suggestedAction: z.string().min(1).default("Monitor"),
});

const AIResponseSchema = z.object({
  trends: z.array(TrendSchema).default([]),
  recommendations: z.array(RecommendationSchema).default([]),
  staffingHealth: z.enum(["optimal", "caution", "warning", "critical"]).default("optimal"),
  predictedChallenges: z.array(ChallengeSchema).default([]),
});

export type AIInsightResult = z.infer<typeof AIResponseSchema>;

const RESULT_SCHEMA = `{
  "trends": [{"type":"string","title":"string","description":"string","severity":"info|warning|success"}],
  "recommendations": [{"id":"string","title":"string","action":"string","priority":"high|medium|low"}],
  "staffingHealth": "optimal|caution|warning|critical",
  "predictedChallenges": [{"challenge":"string","likelihood":"string","suggestedAction":"string"}]
}`;

const AI_TIMEOUT_MS = 10_000;

function buildPrompt(metrics: InsightsMetrics): string {
  return `You are a workforce analytics expert for restaurant operations. Analyze the following metrics and return JSON only.

Metrics:
- Average hours per employee (last month): ${metrics.avgHoursPerEmployee}h
- Attendance rate: ${metrics.attendanceRate}%
- Total anomalies detected: ${metrics.totalAnomalies}
- Unresolved anomalies: ${metrics.unresolvedAnomalies}
- Active employees: ${metrics.activeEmployees}
- Total hours worked (last month): ${metrics.totalHoursWorked}h
- Average check-in time (hour of day): ${metrics.avgCheckinTime.toFixed(1)}
- Incomplete check-outs (forgot to clock out): ${metrics.incompleteCheckouts}
- Staff with no recent activity: ${metrics.inactiveStaffCount}

Return valid JSON matching this structure (no markdown, no extra text):
${RESULT_SCHEMA}

Rules:
- staffingHealth: "optimal" if attendance>=90% and avgHours<45; "caution" if attendance 85-90; "warning" if attendance 75-85; "critical" if attendance<75 or avgHours>50
- trends: 1-4 items, severity one of info|warning|success
- recommendations: 1-4 actionable items, priority one of high|medium|low
- predictedChallenges: 0-3 items based on risk patterns
- Be concise. Use short titles and descriptions.`;
}

function parseAIResponse(text: string): AIInsightResult | null {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  try {
    const raw = JSON.parse(trimmed);
    const result = AIResponseSchema.safeParse(raw);
    if (!result.success) {
      console.warn("[AI] Response failed Zod validation:", result.error.issues.map((i) => i.message).join(", "));
      return null;
    }
    return result.data;
  } catch {
    console.warn("[AI] Failed to parse JSON response");
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function generateAIInsights(metrics: InsightsMetrics): Promise<AIInsightResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.length < 30) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(metrics),
        config: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
      AI_TIMEOUT_MS
    );

    const text = response.text ?? "";
    if (!text) {
      console.warn("[AI] Gemini returned empty response");
      return null;
    }
    return parseAIResponse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AI] Gemini call failed:", message);
    return null;
  }
}
