/**
 * src/shared/lib/gemini.ts
 * Phase 1: Gemini API client & BYOK key storage
 */
import { GoogleGenAI, type Content, type Tool, type GenerateContentResponse } from '@google/genai';

const API_KEY_STORAGE_KEY = 'jee-tracker-gemini-key';
const MODEL_NAME = 'gemini-3.1-flash-lite';

// ── Key Management ─────────────────────────────────────────────────
export function saveApiKey(key: string): void {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function loadApiKey(): string {
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
}

export function clearApiKey(): void {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
}

// ── Client Factory ─────────────────────────────────────────────────
function createClient(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({ apiKey });
}

// ── System Instruction ─────────────────────────────────────────────
const BASE_SYSTEM_INSTRUCTION = `You are **Aria**, an intelligent AI study assistant embedded in OJEE Tracker — an offline-first JEE/OJEE syllabus tracker and study planner.

Your purpose is to help the student:
1. Understand their progress across Physics, Chemistry, and Mathematics.
2. Identify weak areas based on mock test scores and study patterns.
3. Schedule and manage revision tasks directly in the planner.
4. Log and manage study sessions, mock scores, and exam dates.
5. Provide actionable, concise insights without being verbose.

STRICT RULES:
- Never perform write actions without confirming the student's intent.
- Destructive actions (deleting tasks, scores, sessions) MUST be confirmed by the user before execution — the UI handles this via a confirmation card; DO NOT execute them directly.
- Always use the provided tools to read or mutate state. Never hallucinate data.
- When resolving subtopic or chapter names from user messages, use fuzzy matching logic — prefer the closest match from the available data.
- Always communicate in a concise, supportive, and motivational tone.
- Today's date and time are injected in the telemetry payload; use them for scheduling.`;

// ── Chat Turn Types ────────────────────────────────────────────────
export interface ChatFunctionCall {
    name: string;
    args: Record<string, unknown>;
}

export interface ChatFunctionResponse {
    name: string;
    response: Record<string, unknown>;
}

export type ChatPart = any; // Avoid strict typing to allow fields like thought_signature

export interface ChatTurn {
    role: 'user' | 'model';
    parts: ChatPart[];
}

export interface GeminiChatOptions {
    history: ChatTurn[];
    userMessage: string;
    tools: Tool[];
    systemInjection: string;
}

// ── Core Chat Function ─────────────────────────────────────────────
export async function generateChatResponse(options: GeminiChatOptions): Promise<GenerateContentResponse> {
    const apiKey = loadApiKey();
    if (!apiKey) {
        throw new Error('NO_API_KEY');
    }

    const client = createClient(apiKey);

    const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\n---\n## CURRENT USER TELEMETRY\n${options.systemInjection}`;

    // Build contents array — only include non-empty user messages
    const contents: Content[] = options.history.map(turn => ({
        role: turn.role,
        parts: turn.parts,
    }));

    // Append current user message (only if non-empty — empty means tool-response continuation)
    if (options.userMessage) {
        contents.push({ role: 'user', parts: [{ text: options.userMessage }] });
    }

    const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
            systemInstruction,
            tools: options.tools,
        },
    });

    return response;
}
