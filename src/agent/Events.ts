/**
 * Core event model for agent communication
 * All communication is event-driven
 */

export type AgentEvent =
  | { type: "info"; message: string }
  | { type: "ui_action"; label: string; action?: string }
  | { type: "action_suggestion"; action: string; reason?: string }
  | { type: "next_steps"; summary: string; question: string }
  | { type: "user_prompt"; prompt: string }
  | { type: "llm_status"; status: "thinking" | "idle"; message?: string }
  | {
      type: "approval_required";
      action: string;
      api: {
        method: string;
        endpoint: string;
        preview?: string;
      };
      risk: "low" | "medium" | "high";
    }
  | { type: "network"; method: string; url: string; status: number; timestamp: number }
  | { type: "flow"; name: string; step: string }
  | { type: "mode_change"; mode: ExecutionMode }
  | { type: "documentation"; format: "markdown" | "openapi"; content: string }
  | {
      type: "exploration_insight";
      page: string;
      apisFound: number;
      insight: string;
      apis?: string[];
    }
  | {
      type: "exploration_summary";
      totalPages: number;
      totalApis: number;
      summary: string;
      topFindings: string[];
    };

export type ExecutionMode = "EXECUTE" | "OBSERVE_ONLY" | "DOCUMENT_ONLY";

export type ApprovalDecision = "yes" | "no" | "doc";
export type ActionDecision = "yes" | "no";
export type NextStepsDecision = "actions" | "network";

export type EventListener = (event: AgentEvent) => void;
