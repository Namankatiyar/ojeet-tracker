/**
 * src/features/chat/hooks/useAgentChat.ts
 * Phase 4: Conversation loop, function calling intercept, and confirmation flow.
 */
import { useState, useCallback, useRef } from 'react';
import { generateChatResponse, type ChatTurn } from '../../../shared/lib/gemini';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { useStudyCoPilot } from '../../../shared/hooks/useStudyCoPilot';
import { buildTelemetryPayload } from '../utils/telemetryCompiler';
import { useAgentTools } from './useAgentTools';
import { type Tool } from '@google/genai';

// ── Message Types ──────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'model' | 'tool' | 'system';

export interface ConfirmActionPayload {
    toolName: string;
    toolArgs: Record<string, unknown>;
    description: string; // Human-readable description of what will be deleted
}

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    // For pending confirmations
    pendingAction?: ConfirmActionPayload;
    actionId?: string;
    isConfirmed?: boolean;
    isCancelled?: boolean;
    // Typing indicator
    isStreaming?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeMessage(role: MessageRole, content: string, extras?: Partial<ChatMessage>): ChatMessage {
    return { id: makeId(), role, content, timestamp: new Date(), ...extras };
}

// Build a human-readable summary of a destructive action for the confirmation card
function buildDestructionDescription(toolName: string, args: Record<string, unknown>): string {
    switch (toolName) {
        case 'delete_planner_task':
            return `Delete planner task with ID: ${args.task_id}`;
        case 'delete_study_session':
            return `Delete study session with ID: ${args.session_id}`;
        case 'delete_mock_score':
            return `Delete mock score with ID: ${args.score_id}`;
        case 'delete_exam_date':
            return `Delete exam date with ID: ${args.exam_id}`;
        default:
            return `Execute: ${toolName}`;
    }
}

// ── Main Hook ──────────────────────────────────────────────────────────────────
export function useAgentChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        makeMessage('system', 'Hi! I\'m **Aria**, your AI study assistant. I can read your syllabus progress, schedule tasks, log mock scores, and give you personalised insights.\n\nAsk me anything — like *"What should I revise today?"* or *"Schedule Electrostatics revision for tomorrow."*'),
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pending confirmations: actionId → { toolName, args, originalToolCallMessageId }
    const pendingActionsRef = useRef<Map<string, { toolName: string; args: Record<string, unknown>; historyTurn: ChatTurn }>>(new Map());
    // Canonical Gemini conversation history (separate from UI messages)
    const historyRef = useRef<ChatTurn[]>([]);

    const { progress, plannerTasks, mockScores, studySessions, examDates,
        physicsProgress, chemistryProgress, mathsProgress, overallProgress } = useUserProgress();
    const { mergedSubjectData: _sd } = useSubjectData();
    const { recommendations, studyShares, totalWeeklyHours } = useStudyCoPilot();
    const { toolDeclarations, executeToolCall, isDestructive } = useAgentTools();

    // ── Build Telemetry ────────────────────────────────────────────────────────
    const buildTelemetry = useCallback((): string => {
        return buildTelemetryPayload({
            progress, plannerTasks, mockScores, studySessions, examDates,
            physicsProgress, chemistryProgress, mathsProgress, overallProgress,
            recommendations, studyShares, totalWeeklyHours,
        });
    }, [progress, plannerTasks, mockScores, studySessions, examDates,
        physicsProgress, chemistryProgress, mathsProgress, overallProgress,
        recommendations, studyShares, totalWeeklyHours]);

    // ── Append UI message ──────────────────────────────────────────────────────
    const appendMessage = useCallback((msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
        return msg;
    }, []);

    const updateLastMessage = useCallback((updater: (msg: ChatMessage) => ChatMessage) => {
        setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = updater(copy[copy.length - 1]);
            return copy;
        });
    }, []);

    // ── Core Execution Loop ────────────────────────────────────────────────────
    const runAgentLoop = useCallback(async (userMessage: string, extraHistory?: ChatTurn[]) => {
        setIsLoading(true);
        setError(null);

        // Add streaming placeholder
        const streamingMsg = makeMessage('model', '', { isStreaming: true });
        appendMessage(streamingMsg);

        try {
            const history = extraHistory ?? historyRef.current;
            const tools: Tool[] = [toolDeclarations];

            const result = await generateChatResponse({
                history,
                userMessage,
                tools,
                systemInjection: buildTelemetry(),
            });

            const candidate = result.candidates?.[0];
            if (!candidate) {
                throw new Error('No response from Gemini.');
            }

            const parts = candidate.content?.parts ?? [];
            const textParts = parts.filter(p => p.text).map(p => p.text!).join('');
            const functionCalls = parts.filter(p => p.functionCall);

            // Update history with user message
            historyRef.current = [
                ...history,
                { role: 'user', parts: [{ text: userMessage }] },
                { role: 'model', parts },
            ];

            if (functionCalls.length > 0) {
                // Handle function calls — remove streaming placeholder first
                updateLastMessage(m => ({ ...m, isStreaming: false, content: textParts || '⚙️ Processing...', role: 'model' }));

                // Process each function call
                const toolResponseParts: any[] = [];

                for (const fc of functionCalls) {
                    const { name, args } = fc.functionCall as { name: string; args: Record<string, unknown> };

                    if (isDestructive(name)) {
                        // ── DESTRUCTIVE INTERCEPT ──────────────────────────
                        const actionId = makeId();
                        const description = buildDestructionDescription(name, args);
                        const modelTurn: ChatTurn = { role: 'model', parts: [{ functionCall: { name, args } }] };

                        pendingActionsRef.current.set(actionId, { toolName: name, args, historyTurn: modelTurn });

                        appendMessage(makeMessage('model', description, {
                            pendingAction: { toolName: name, toolArgs: args, description },
                            actionId,
                        }));
                        // Don't add tool response to history yet — wait for confirmation
                        setIsLoading(false);
                        return;
                    } else {
                        // ── AUTO EXECUTE ───────────────────────────────────
                        const toolResult = executeToolCall(name, args);
                        toolResponseParts.push({
                            functionResponse: { name, response: JSON.parse(toolResult) }
                        });
                    }
                }

                if (toolResponseParts.length > 0) {
                    // Push tool responses into history
                    const toolHistoryTurn: ChatTurn = {
                        role: 'user',
                        parts: toolResponseParts,
                    };
                    historyRef.current = [...historyRef.current, toolHistoryTurn];

                    // Recursively call the agent with empty message (it will pick up tool responses)
                    await runAgentLoop('', historyRef.current);
                    return;
                }
            } else {
                // ── PURE TEXT RESPONSE ─────────────────────────────────────
                updateLastMessage(m => ({
                    ...m,
                    isStreaming: false,
                    content: textParts || '(No response)',
                }));
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            if (errorMsg === 'NO_API_KEY') {
                updateLastMessage(m => ({
                    ...m,
                    isStreaming: false,
                    content: '🔑 **API key not configured.** Please paste your Gemini API key in the settings field above.',
                }));
            } else {
                updateLastMessage(m => ({
                    ...m,
                    isStreaming: false,
                    content: `❌ Error: ${errorMsg}`,
                }));
                setError(errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    }, [toolDeclarations, buildTelemetry, appendMessage, updateLastMessage, executeToolCall, isDestructive]);

    // ── Public: Send Message ───────────────────────────────────────────────────
    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        appendMessage(makeMessage('user', content));
        await runAgentLoop(content);
    }, [isLoading, appendMessage, runAgentLoop]);

    // ── Public: Confirm Pending Action ─────────────────────────────────────────
    const confirmPendingAction = useCallback(async (actionId: string) => {
        const pending = pendingActionsRef.current.get(actionId);
        if (!pending) return;

        pendingActionsRef.current.delete(actionId);

        // Mark confirmed in UI
        setMessages(prev => prev.map(m =>
            m.actionId === actionId ? { ...m, isConfirmed: true } : m
        ));

        // Execute the destructive action
        const toolResult = executeToolCall(pending.toolName, pending.args);

        // Push tool call + response into history
        historyRef.current = [
            ...historyRef.current,
            pending.historyTurn,
            {
                role: 'user',
                parts: [{ functionResponse: { name: pending.toolName, response: JSON.parse(toolResult) } }],
            },
        ];

        // Continue the loop to get a final confirmation message from Gemini
        await runAgentLoop('', historyRef.current);
    }, [executeToolCall, runAgentLoop]);

    // ── Public: Cancel Pending Action ──────────────────────────────────────────
    const cancelPendingAction = useCallback((actionId: string) => {
        pendingActionsRef.current.delete(actionId);
        setMessages(prev => prev.map(m =>
            m.actionId === actionId ? { ...m, isCancelled: true } : m
        ));
        // Push a cancellation tool response into history
        // so Gemini knows the action was cancelled
        appendMessage(makeMessage('model', '✅ Action cancelled.'));
    }, [appendMessage]);

    // ── Public: Clear Chat ─────────────────────────────────────────────────────
    const clearChat = useCallback(() => {
        historyRef.current = [];
        pendingActionsRef.current.clear();
        setMessages([
            makeMessage('system', 'Chat cleared. How can I help you?'),
        ]);
        setError(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        confirmPendingAction,
        cancelPendingAction,
        clearChat,
    };
}
