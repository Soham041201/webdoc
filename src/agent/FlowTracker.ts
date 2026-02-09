/**
 * Tracks multi-step flows and groups related actions
 */

export interface FlowStep {
  name: string;
  step: string;
  timestamp: number;
  networkCalls: NetworkCall[];
  uiActions: string[];
}

export interface NetworkCall {
  method: string;
  url: string;
  status: number;
  timestamp: number;
}

export interface Flow {
  name: string;
  steps: FlowStep[];
  startTime: number;
  endTime?: number;
}

export class FlowTracker {
  private flows: Map<string, Flow> = new Map();
  private currentFlow: Flow | null = null;

  startFlow(name: string): void {
    const flow: Flow = {
      name,
      steps: [],
      startTime: Date.now(),
    };
    this.flows.set(name, flow);
    this.currentFlow = flow;
  }

  addStep(
    stepName: string,
    networkCalls: NetworkCall[] = [],
    uiActions: string[] = [],
  ): void {
    if (!this.currentFlow) {
      this.startFlow("Untitled Flow");
    }

    const step: FlowStep = {
      name: this?.currentFlow?.name || "Untitled Flow",
      step: stepName,
      timestamp: Date.now(),
      networkCalls,
      uiActions,
    };

    this?.currentFlow?.steps.push(step);
  }

  endFlow(): void {
    if (this.currentFlow) {
      this.currentFlow.endTime = Date.now();
      this.currentFlow = null;
    }
  }

  getFlow(name: string): Flow | undefined {
    return this.flows.get(name);
  }

  getAllFlows(): Flow[] {
    return Array.from(this.flows.values());
  }

  getCurrentFlow(): Flow | null {
    return this.currentFlow;
  }
}
