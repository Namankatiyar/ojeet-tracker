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

// (Removed BASE_SYSTEM_INSTRUCTION in favor of dynamic agentPromptBuilder)

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
  systemInstruction: string;
}

// ── Core Chat Function ─────────────────────────────────────────────
export async function generateChatResponse(
  options: GeminiChatOptions
): Promise<GenerateContentResponse> {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const client = createClient(apiKey);

  const systemInstruction = options.systemInstruction;

  // Build contents array — only include non-empty user messages
  const contents: Content[] = options.history.map((turn) => ({
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
