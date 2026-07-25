/**
 * src/features/chat/hooks/useAgentChat.ts
 * Phase 4: Conversation loop, function calling intercept, and confirmation flow.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { generateChatResponse, type ChatTurn } from '../../../shared/lib/gemini';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { useStudyCoPilot } from '../../../shared/hooks/useStudyCoPilot';
import { buildAgentSystemPrompt, AgentContext } from '../utils/agentPromptBuilder';
import { useAgentTools } from './useAgentTools';
import { type Tool } from '@google/genai';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { getLogicalTodayStr } from '../../../shared/utils/date';

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
  timestamp: string; // ISO string for local storage compatibility
  // For pending confirmations
  pendingAction?: ConfirmActionPayload;
  actionId?: string;
  isConfirmed?: boolean;
  isCancelled?: boolean;
  // Typing indicator
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  history: ChatTurn[];
  lastUpdated: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeMessage(
  role: MessageRole,
  content: string,
  extras?: Partial<ChatMessage>
): ChatMessage {
  return { id: makeId(), role, content, timestamp: new Date().toISOString(), ...extras };
}

const DEFAULT_WELCOME_TEXT =
  'Hi! I\'m **Blue**, your AI study buddy. I can track your syllabus progress, schedule tasks, log mock scores, and keep you on track without burning you out.\n\nAsk me anything — like *"What should I revise today?"* or *"Schedule Electrostatics revision for tomorrow."*';

function getInitialSessions(): ChatSession[] {
  return [
    {
      id: makeId(),
      title: 'New Conversation',
      messages: [makeMessage('system', DEFAULT_WELCOME_TEXT)],
      history: [],
      lastUpdated: new Date().toISOString(),
    },
  ];
}

function getFriendlyErrorMessage(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();

  if (errorMsg === 'NO_API_KEY') {
    return '🔑 **API key not configured.** Please paste your Gemini API key in the settings field above.';
  }

  if (
    msg.includes('api key not valid') ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid key') ||
    msg.includes('api key')
  ) {
    return '🔑 **Invalid API Key.** The key you provided is not recognized by Google Gemini. Please click the key icon `🔑` in the top right to verify or update your key.';
  }

  if (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('offline') ||
    msg.includes('timeout')
  ) {
    return '🌐 **Connection Error.** Could not reach Gemini servers. Please verify your internet connection and try again.';
  }

  if (msg.includes('quota') || msg.includes('limit') || msg.includes('429')) {
    return '⏳ **Rate Limit Exceeded.** You have reached the request limit for your free Gemini API key. Please wait a moment before trying again.';
  }

  return `⚠️ **Blue encountered an error.** Please try again or recheck your API key configurations if this persists.\n\n*(Error details: ${errorMsg})*`;
}

function getToolProcessingMessage(name: string, args: Record<string, unknown>): string {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const formatSubject = (sub: unknown) => (typeof sub === 'string' ? capitalize(sub) : '');

  switch (name) {
    case 'toggle_chapter_material':
      return `⚙️ Updating progress for ${formatSubject(args.subject)} chapter "${args.chapter_name}" (${args.material})...`;
    case 'toggle_subtopic_material':
      return `⚙️ Updating progress for subtopic "${args.subtopic_name}" in "${args.chapter_name}" (${args.material})...`;
    case 'update_subtopic_attempted':
      return `⚙️ Updating question attempts for "${args.subtopic_name}" in "${args.chapter_name}"...`;
    case 'set_subtopic_last_revised':
      return `⚙️ Setting revision date for "${args.subtopic_name}" in "${args.chapter_name}"...`;
    case 'set_chapter_priority':
      return `⚙️ Setting priority for "${args.chapter_name}" to ${args.priority}...`;
    case 'mark_chapter_revised':
      return `⚙️ Marking "${args.chapter_name}" as revised...`;
    case 'add_planner_task':
      return `⚙️ Adding task "${args.title}" to planner...`;
    case 'toggle_planner_task':
      return `⚙️ Updating planner task...`;
    case 'delete_planner_task':
      return `⚙️ Deleting planner task...`;
    case 'schedule_revision':
      return `⚙️ Scheduling revision for "${args.chapter_name}"...`;
    case 'log_study_session':
      return `⚙️ Logging study session "${args.title}" (${args.duration_minutes} min)...`;
    case 'delete_study_session':
      return `⚙️ Deleting study session...`;
    case 'add_mock_score':
      return `⚙️ Logging mock score for "${args.name}"...`;
    case 'delete_mock_score':
      return `⚙️ Deleting mock score...`;
    case 'add_exam_date':
      return `⚙️ Adding exam date for "${args.name}"...`;
    case 'delete_exam_date':
      return `⚙️ Deleting exam date...`;
    case 'set_primary_exam':
      return `⚙️ Setting primary countdown exam...`;
    case 'get_chapter_progress':
      return `⚙️ Checking progress for "${args.chapter_name}"...`;
    case 'get_subject_chapters':
      return `⚙️ Retrieving chapters for ${formatSubject(args.subject)}...`;
    case 'list_planner_tasks':
      return `⚙️ Loading planner tasks...`;
    case 'list_study_sessions':
      return `⚙️ Loading study sessions...`;
    case 'list_mock_scores':
      return `⚙️ Loading mock scores...`;
    case 'list_exam_dates':
      return `⚙️ Loading exam dates...`;
    default:
      return `⚙️ Running action: ${name}...`;
  }
}

// ── Main Hook ──────────────────────────────────────────────────────────────────
export function useAgentChat() {
  const [sessions, setSessions] = useLocalStorage<ChatSession[]>(
    'ojee_chat_sessions',
    getInitialSessions()
  );
  const [activeSessionId, setActiveSessionId] = useLocalStorage<string>(
    'ojee_active_chat_session_id',
    ''
  );
  const [parkedSessions] = useLocalStorage<any[]>(
    'studyClock_parkedSessions',
    []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending confirmations: actionId → { toolName, args, originalToolCallMessageId }
  const pendingActionsRef = useRef<
    Map<string, { toolName: string; args: Record<string, unknown>; historyTurn: ChatTurn }>
  >(new Map());
  // Canonical Gemini conversation history (separate from UI messages)
  const historyRef = useRef<ChatTurn[]>([]);

  const {
    progress,
    plannerTasks,
    mockScores,
    mockExamPresets,
    studySessions,
    examDates,
    physicsProgress,
    chemistryProgress,
    mathsProgress,
    biologyProgress,
    overallProgress,
    lectureCounter,
    examMode,
    dailyResetHour,
  } = useUserProgress();
  const { mergedSubjectData: _sd } = useSubjectData();
  const { recommendations, studyShares, totalWeeklyHours } = useStudyCoPilot();
  const { toolDeclarations, executeToolCall, isDestructive } = useAgentTools();

  // ── Session Management ────────────────────────────────────────────────────────

  // Ensure we always have a valid active session pointer
  const currentSessionId =
    activeSessionId && sessions.some((s) => s.id === activeSessionId)
      ? activeSessionId
      : sessions[0]?.id || '';

  const activeSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  // Sync history ref with active session whenever it changes
  useEffect(() => {
    if (activeSession) {
      historyRef.current = activeSession.history || [];
    } else {
      historyRef.current = [];
    }
  }, [currentSessionId, activeSession]);

  const startNewSession = useCallback(() => {
    const newSession = getInitialSessions()[0];
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, [setSessions, setActiveSessionId]);

  const switchSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
    },
    [setActiveSessionId]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        if (remaining.length === 0) {
          const fresh = getInitialSessions();
          setActiveSessionId(fresh[0].id);
          return fresh;
        }
        if (id === activeSessionId) {
          setActiveSessionId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeSessionId, setActiveSessionId, setSessions]
  );

  // ── Build Agent Prompt ────────────────────────────────────────────────────────
  const buildAgentPrompt = useCallback((): string => {
    const ctx: AgentContext = {
      nowIso: new Date().toISOString(),
      todayStr: getLogicalTodayStr(dailyResetHour),
      plannerTasks,
      mockScores,
      mockExamPresets,
      studySessions,
      examDates,
      physicsProgress,
      chemistryProgress,
      mathsProgress,
      biologyProgress,
      overallProgress,
      recommendations,
      studyShares,
      totalWeeklyHours,
      lectureCounter,
      parkedSessions,
      examMode,
    };
    return buildAgentSystemPrompt(ctx);
  }, [
    progress,
    plannerTasks,
    mockScores,
    mockExamPresets,
    studySessions,
    examDates,
    physicsProgress,
    chemistryProgress,
    mathsProgress,
    biologyProgress,
    overallProgress,
    recommendations,
    studyShares,
    totalWeeklyHours,
    lectureCounter,
    parkedSessions,
    examMode,
  ]);

  // ── Append UI message to Active Session ───────────────────────────────────
  const updateActiveSession = useCallback(
    (updater: (s: ChatSession) => ChatSession) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            const updated = updater(s);
            return {
              ...updated,
              lastUpdated: new Date().toISOString(),
            };
          }
          return s;
        })
      );
    },
    [currentSessionId, setSessions]
  );

  const appendMessage = useCallback(
    (msg: ChatMessage) => {
      updateActiveSession((s) => ({
        ...s,
        messages: [...s.messages, msg],
      }));
      return msg;
    },
    [updateActiveSession]
  );

  const updateMessageById = useCallback(
    (id: string, updater: (msg: ChatMessage) => ChatMessage) => {
      updateActiveSession((s) => ({
        ...s,
        messages: s.messages.map((m) => (m.id === id ? updater(m) : m)),
      }));
    },
    [updateActiveSession]
  );

  // Build a human-readable summary of a destructive action for the confirmation card
  const buildDestructionDescription = useCallback(
    (toolName: string, args: Record<string, unknown>): string => {
      switch (toolName) {
        case 'delete_planner_task': {
          const task = plannerTasks.find((t) => t.id === args.task_id);
          return task
            ? `Delete task "${task.title}" scheduled for ${task.date}?`
            : `Delete planner task with ID: ${args.task_id}`;
        }
        case 'delete_study_session': {
          const session = studySessions.find((s) => s.id === args.session_id);
          return session
            ? `Delete study session of ${session.title || session.subject || 'task'} (${Math.round((session.duration || 0) / 60)} min)?`
            : `Delete study session with ID: ${args.session_id}`;
        }
        case 'delete_mock_score': {
          const score = mockScores.find((s) => s.id === args.score_id);
          return score
            ? `Delete mock score of ${score.totalMarks} marks in "${score.name}"?`
            : `Delete mock score with ID: ${args.score_id}`;
        }
        case 'delete_exam_date': {
          const exam = examDates.find((e) => e.id === args.exam_id);
          return exam
            ? `Delete exam date "${exam.name}" on ${exam.date}?`
            : `Delete exam date with ID: ${args.exam_id}`;
        }
        default:
          return `Execute: ${toolName}`;
      }
    },
    [plannerTasks, studySessions, mockScores, examDates]
  );

  // ── Core Execution Loop ────────────────────────────────────────────────────
  const runAgentLoop = useCallback(
    async (userMessage: string, extraHistory?: ChatTurn[], targetMessageId?: string) => {
      setIsLoading(true);
      setError(null);

      let activeMsgId = targetMessageId;

      if (!activeMsgId) {
        // Add streaming placeholder
        const streamingMsg = makeMessage('model', '', { isStreaming: true });
        appendMessage(streamingMsg);
        activeMsgId = streamingMsg.id;
      } else {
        // Ensure the existing target message is marked as streaming
        updateMessageById(activeMsgId, (m) => ({ ...m, isStreaming: true }));
      }

      try {
        const history = extraHistory ?? historyRef.current;
        const tools: Tool[] = [toolDeclarations];

        const result = await generateChatResponse({
          history,
          userMessage,
          tools,
          systemInstruction: buildAgentPrompt(),
        });

        const candidate = result.candidates?.[0];
        if (!candidate) {
          throw new Error('No response from Gemini.');
        }

        const parts = candidate.content?.parts ?? [];
        const textParts = parts
          .filter((p) => p.text)
          .map((p) => p.text!)
          .join('');
        const functionCalls = parts.filter((p) => p.functionCall);

        // Update history with user message / model response
        const newHistory: ChatTurn[] = [...history];
        if (userMessage) {
          newHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        }
        newHistory.push({ role: 'model', parts });
        historyRef.current = newHistory;
        updateActiveSession((s) => ({ ...s, history: newHistory }));

        if (functionCalls.length > 0) {
          // Determine processing message for the first tool
          const firstCall = functionCalls[0].functionCall as {
            name: string;
            args: Record<string, unknown>;
          };
          const processingMsg = getToolProcessingMessage(firstCall.name, firstCall.args);

          updateMessageById(activeMsgId, (m) => ({
            ...m,
            isStreaming: true,
            content: textParts ? `${textParts}\n\n${processingMsg}` : processingMsg,
            role: 'model',
          }));

          // Process each function call
          const toolResponseParts: any[] = [];

          for (const fc of functionCalls) {
            const { name, args } = fc.functionCall as {
              name: string;
              args: Record<string, unknown>;
            };

            if (isDestructive(name)) {
              // ── DESTRUCTIVE INTERCEPT ──────────────────────────
              const actionId = makeId();
              const description = buildDestructionDescription(name, args);
              const modelTurn: ChatTurn = {
                role: 'model',
                parts: [{ functionCall: { name, args } }],
              };

              pendingActionsRef.current.set(actionId, {
                toolName: name,
                args,
                historyTurn: modelTurn,
              });

              // Update active message to become the destructive action ConfirmCard
              updateMessageById(activeMsgId, (m) => ({
                ...m,
                isStreaming: false,
                content: description,
                pendingAction: { toolName: name, toolArgs: args, description },
                actionId,
              }));

              setIsLoading(false);
              return;
            } else {
              // ── AUTO EXECUTE ───────────────────────────────────
              const toolResult = executeToolCall(name, args);
              toolResponseParts.push({
                functionResponse: { name, response: JSON.parse(toolResult) },
              });
            }
          }

          if (toolResponseParts.length > 0) {
            // Push tool responses into history
            const toolHistoryTurn: ChatTurn = {
              role: 'user',
              parts: toolResponseParts,
            };
            const updatedHistory = [...historyRef.current, toolHistoryTurn];
            historyRef.current = updatedHistory;
            updateActiveSession((s) => ({ ...s, history: updatedHistory }));

            // Recursively call the agent with empty message, passing activeMsgId to reuse the message bubble
            await runAgentLoop('', historyRef.current, activeMsgId);
            return;
          }
        } else {
          // ── PURE TEXT RESPONSE ─────────────────────────────────────
          updateMessageById(activeMsgId, (m) => ({
            ...m,
            isStreaming: false,
            content: textParts || '(No response)',
          }));
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        const friendlyMsg = getFriendlyErrorMessage(errorMsg);
        updateMessageById(activeMsgId, (m) => ({
          ...m,
          isStreaming: false,
          content: friendlyMsg,
        }));
        if (errorMsg !== 'NO_API_KEY') {
          setError(errorMsg);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      toolDeclarations,
      buildAgentPrompt,
      appendMessage,
      updateMessageById,
      executeToolCall,
      isDestructive,
      updateActiveSession,
      buildDestructionDescription,
    ]
  );

  // ── Public: Send Message ───────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg = makeMessage('user', content);

      // Add to active session and update title if it's default
      updateActiveSession((s) => {
        const isDefaultTitle = s.title === 'New Conversation' || s.title === 'New Chat';
        const cleanTitle = isDefaultTitle
          ? content.length > 25
            ? content.slice(0, 22) + '...'
            : content
          : s.title;
        return {
          ...s,
          title: cleanTitle,
          messages: [...s.messages, userMsg],
        };
      });

      await runAgentLoop(content);
    },
    [isLoading, updateActiveSession, runAgentLoop]
  );

  // ── Public: Confirm Pending Action ─────────────────────────────────────────
  const confirmPendingAction = useCallback(
    async (actionId: string) => {
      const pending = pendingActionsRef.current.get(actionId);
      if (!pending) return;

      pendingActionsRef.current.delete(actionId);

      // Mark confirmed in UI
      updateActiveSession((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.actionId === actionId ? { ...m, isConfirmed: true } : m
        ),
      }));

      // Execute the destructive action
      const toolResult = executeToolCall(pending.toolName, pending.args);

      // Push tool call + response into history
      const newHistory: ChatTurn[] = [
        ...historyRef.current,
        pending.historyTurn,
        {
          role: 'user',
          parts: [
            { functionResponse: { name: pending.toolName, response: JSON.parse(toolResult) } },
          ],
        },
      ];
      historyRef.current = newHistory;
      updateActiveSession((s) => ({ ...s, history: newHistory }));

      // Continue the loop to get a final confirmation message from Gemini
      await runAgentLoop('', historyRef.current);
    },
    [executeToolCall, runAgentLoop, updateActiveSession]
  );

  // ── Public: Cancel Pending Action ──────────────────────────────────────────
  const cancelPendingAction = useCallback(
    (actionId: string) => {
      pendingActionsRef.current.delete(actionId);
      updateActiveSession((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.actionId === actionId ? { ...m, isCancelled: true } : m
        ),
      }));
      appendMessage(makeMessage('model', '✅ Action cancelled.'));
    },
    [updateActiveSession, appendMessage]
  );

  // ── Public: Clear Chat ─────────────────────────────────────────────────────
  const clearActiveSession = useCallback(() => {
    historyRef.current = [];
    pendingActionsRef.current.clear();
    updateActiveSession((s) => ({
      ...s,
      title: 'New Conversation',
      messages: [makeMessage('system', 'Chat cleared. How can I help you?')],
      history: [],
    }));
    setError(null);
  }, [updateActiveSession]);

  return {
    sessions,
    activeSessionId: currentSessionId,
    startNewSession,
    switchSession,
    deleteSession,
    messages,
    isLoading,
    error,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
    clearActiveSession,
  };
}
