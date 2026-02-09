/**
 * Core Agent class with human-in-the-loop approval system
 */

import type {
  ActionDecision,
  AgentEvent,
  ApprovalDecision,
  EventListener,
  ExecutionMode,
  NextStepsDecision,
} from "./Events.js";
import { assessRisk } from "./Risk.js";
import { FlowTracker, type Flow } from "./FlowTracker.js";

export class Agent {
  private listeners: EventListener[] = [];
  private resolver?: (decision: ApprovalDecision) => void;
  private actionResolver?: (decision: ActionDecision) => void;
  private nextStepsResolver?: (decision: NextStepsDecision) => void;
  private mode: ExecutionMode = "OBSERVE_ONLY";
  private flowTracker: FlowTracker = new FlowTracker();

  onEvent(cb: EventListener): void {
    this.listeners.push(cb);
  }

  offEvent(cb: EventListener): void {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }

  emit(event: AgentEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  async requestApproval(payload: {
    action: string;
    api: {
      method: string;
      endpoint: string;
      preview?: string;
    };
    risk: "low" | "medium" | "high";
  }): Promise<ApprovalDecision> {
    this.emit({ type: "approval_required", ...payload });
    return new Promise<ApprovalDecision>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolveApproval(decision: ApprovalDecision): void {
    if (this.resolver) {
      this.resolver(decision);
      this.resolver = undefined;
    }
  }

  async requestActionDecision(payload: {
    action: string;
    reason?: string;
  }): Promise<ActionDecision> {
    this.emit({ type: "action_suggestion", ...payload });
    return new Promise<ActionDecision>((resolve) => {
      this.actionResolver = resolve;
    });
  }

  resolveActionDecision(decision: ActionDecision): void {
    if (this.actionResolver) {
      this.actionResolver(decision);
      this.actionResolver = undefined;
    }
  }

  async requestNextSteps(payload: {
    summary: string;
    question: string;
  }): Promise<NextStepsDecision> {
    this.emit({ type: "next_steps", ...payload });
    return new Promise<NextStepsDecision>((resolve) => {
      this.nextStepsResolver = resolve;
    });
  }

  resolveNextSteps(decision: NextStepsDecision): void {
    if (this.nextStepsResolver) {
      this.nextStepsResolver(decision);
      this.nextStepsResolver = undefined;
    }
  }

  setMode(mode: ExecutionMode): void {
    this.mode = mode;
    this.emit({ type: "mode_change", mode });
  }

  getMode(): ExecutionMode {
    return this.mode;
  }

  getFlowTracker(): FlowTracker {
    return this.flowTracker;
  }

  async handleNetworkCall(
    method: string,
    url: string,
    status: number
  ): Promise<ApprovalDecision | null> {
    const risk = assessRisk(method, url);
    const timestamp = Date.now();

    this.emit({ type: "network", method, url, status, timestamp });

    // High risk always requires approval
    if (risk === "high") {
      const decision = await this.requestApproval({
        action: `${method} ${url}`,
        api: { method, endpoint: url },
        risk,
      });
      return decision;
    }

    // Medium risk requires approval in EXECUTE mode
    if (risk === "medium" && this.mode === "EXECUTE") {
      const decision = await this.requestApproval({
        action: `${method} ${url}`,
        api: { method, endpoint: url },
        risk,
      });
      return decision;
    }

    return null;
  }
}
