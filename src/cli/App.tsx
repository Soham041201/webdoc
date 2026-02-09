/**
 * Main React Ink CLI application
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { Layout } from "./Layout.js";
import { ActionSuggestionPrompt, ApprovalPrompt } from "./Prompt.js";
import { theme } from "./Theme.js";
import type { Agent } from "../agent/Agent.js";
import type { ActionDecision, AgentEvent, ApprovalDecision } from "../agent/Events.js";

interface AppProps {
  agent: Agent;
  initialEvents?: AgentEvent[];
}

export const App: React.FC<AppProps> = ({ agent, initialEvents = [] }) => {
  const [events, setEvents] = useState<AgentEvent[]>(initialEvents);
  const [pendingApproval, setPendingApproval] = useState<AgentEvent | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<AgentEvent | null>(null);
  const [typedAction, setTypedAction] = useState("");
  const [showNetworkLogs, setShowNetworkLogs] = useState(false);
  const [llmStatus, setLlmStatus] = useState<{ status: "thinking" | "idle"; message?: string }>({
    status: "idle",
  });
  const inputEnabled = !pendingApproval && !pendingSuggestion;

  useEffect(() => {
    const handleEvent = (event: AgentEvent) => {
      if (event.type === "llm_status") {
        setLlmStatus({ status: event.status, message: event.message });
        return;
      }

      setEvents((prev) => [...prev, event]);

      if (event.type === "approval_required") {
        setPendingApproval(event);
      }

      if (event.type === "action_suggestion") {
        setPendingSuggestion(event);
      }
    };

    agent.onEvent(handleEvent);

    return () => {
      agent.offEvent(handleEvent);
    };
  }, [agent]);

  const handleApprovalDecision = (decision: ApprovalDecision) => {
    if (pendingApproval) {
      agent.resolveApproval(decision);
      setPendingApproval(null);
    }
  };

  const handleSuggestionDecision = (decision: ActionDecision) => {
    if (pendingSuggestion) {
      agent.resolveActionDecision(decision);
      setPendingSuggestion(null);
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape) {
        setTypedAction("");
      }
    },
    { isActive: inputEnabled }
  );

  return (
    <Layout title="WebDoc Agent">
      <Box flexDirection="column">
        {/* Approval prompt */}
        {pendingApproval && pendingApproval.type === "approval_required" && (
          <ApprovalPrompt
            action={pendingApproval.action}
            api={pendingApproval.api}
            risk={pendingApproval.risk}
            onDecision={handleApprovalDecision}
          />
        )}

        {/* Next steps prompt (disabled for now) */}

        {/* Action suggestion prompt */}
        {pendingSuggestion && pendingSuggestion.type === "action_suggestion" && (
          <ActionSuggestionPrompt
            action={pendingSuggestion.action}
            reason={pendingSuggestion.reason}
            onDecision={handleSuggestionDecision}
          />
        )}

        {/* Event log */}
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.muted} bold>
            Event Log:
          </Text>
          <Text color={theme.colors.muted}>
            Network logs: {showNetworkLogs ? "visible" : "hidden"} (type /network on|off)
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {events
              .filter((event) => (showNetworkLogs ? true : event.type !== "network"))
              .slice(-20)
              .map((event, index) => (
                <EventLine key={index} event={event} />
              ))}
          </Box>
        </Box>

        {llmStatus.status === "thinking" && (
          <Box marginTop={1}>
            <Text color={theme.colors.info}>
              <Spinner type="dots" /> {llmStatus.message || "LLM thinking..."}
            </Text>
          </Box>
        )}

        {/* Instruction input (always at bottom) */}
        <Box marginTop={1}>
          <Text color={theme.colors.primary}>{"> "}</Text>
          <TextInput
            value={typedAction}
            placeholder={
              inputEnabled ? "Type a command... (/network on|off)" : "Input disabled"
            }
            focus={inputEnabled}
            onChange={setTypedAction}
            onSubmit={(value) => {
              const action = value.trim();
              if (action.length > 0) {
                const lower = action.toLowerCase();
                if (lower.startsWith("/network")) {
                  const arg = lower.split(/\s+/)[1];
                  if (arg === "on") {
                    setShowNetworkLogs(true);
                    agent.emit({ type: "info", message: "Network logs enabled." });
                  } else if (arg === "off") {
                    setShowNetworkLogs(false);
                    agent.emit({ type: "info", message: "Network logs hidden." });
                  } else {
                    setShowNetworkLogs((prev) => {
                      const next = !prev;
                      agent.emit({
                        type: "info",
                        message: next ? "Network logs enabled." : "Network logs hidden.",
                      });
                      return next;
                    });
                  }
                } else {
                  agent.emit({ type: "user_prompt", prompt: action });
                }
              }
              setTypedAction("");
            }}
          />
        </Box>
      </Box>
    </Layout>
  );
};

const EventLine: React.FC<{ event: AgentEvent }> = ({ event }) => {
  switch (event.type) {
    case "info":
      return (
        <Text color={theme.colors.info}>
          ℹ {event.message}
        </Text>
      );
    case "ui_action":
      return (
        <Text color={theme.colors.primary}>
          🖱 {event.label}
        </Text>
      );
    case "network":
      return (
        <Text color={theme.colors.muted}>
          🌐 {event.method} {event.url} ({event.status})
        </Text>
      );
    case "flow":
      return (
        <Text color={theme.colors.success}>
          📋 {event.name} → {event.step}
        </Text>
      );
    case "mode_change":
      return (
        <Text color={theme.colors.warning}>
          🔄 Mode changed to {event.mode}
        </Text>
      );
    case "action_suggestion":
      return (
        <Text color={theme.colors.primary}>
          🤖 Suggestion: {event.action}
        </Text>
      );
    case "user_prompt":
      return (
        <Text color={theme.colors.primary}>
          ⌨️ Prompt: {event.prompt}
        </Text>
      );
    case "exploration_insight":
      return (
        <Box flexDirection="column" marginLeft={1}>
          <Text color={theme.colors.success} bold>
            🔍 {event.page} — {event.apisFound} API(s) found
          </Text>
          <Text color={theme.colors.info} wrap="wrap">
            {"   "}{event.insight}
          </Text>
          {event.apis && event.apis.length > 0 && (
            <Box flexDirection="column" marginLeft={3}>
              {event.apis.slice(0, 4).map((api, i) => (
                <Text key={i} color={theme.colors.muted}>
                  → {api}
                </Text>
              ))}
              {event.apis.length > 4 && (
                <Text color={theme.colors.muted}>
                  → ...and {event.apis.length - 4} more
                </Text>
              )}
            </Box>
          )}
        </Box>
      );
    case "exploration_summary":
      return (
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text color={theme.colors.success} bold>
            ━━━ Exploration Complete: {event.totalPages} pages, {event.totalApis} unique APIs ━━━
          </Text>
          <Text color={theme.colors.info} wrap="wrap">
            {event.summary}
          </Text>
          {event.topFindings.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color={theme.colors.primary} bold>Key Findings:</Text>
              {event.topFindings.map((finding, i) => (
                <Text key={i} color={theme.colors.info} wrap="wrap">
                  {` ${i + 1}. ${finding}`}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      );
    default:
      return null;
  }
};
