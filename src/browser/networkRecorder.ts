/**
 * Records network requests and responses
 */

import type { Page, Request, Response } from "playwright";
import type { Agent } from "../agent/Agent.js";

export interface CapturedCall {
  method: string;
  url: string;
  status: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
}

interface RequestInfo {
  method: string;
  url: string;
  headers: Record<string, string>;
  postData?: string | null;
  resourceType: string;
  timestamp: number;
}

export class NetworkRecorder {
  private agent: Agent;
  private page: Page;
  private requests: Map<Request, RequestInfo> = new Map();
  private captureActive = false;
  private captureBaseDomain: string | null = null;
  private includeThirdParty = false;
  private capturedCalls: CapturedCall[] = [];
  private onCapture?: (call: CapturedCall) => void;

  constructor(agent: Agent, page: Page) {
    this.agent = agent;
    this.page = page;
  }

  async start(): Promise<void> {
    // Record requests
    this.page.on("request", async (request) => {
      this.requests.set(request, {
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      });
    });

    // Record responses and emit events
    this.page.on("response", async (response) => {
      const request = response.request();
      const info = this.requests.get(request);
      const url = response.url();
      const status = response.status();
      const method = info?.method || request.method() || "GET";

      // Handle network call through agent (for approval if needed)
      await this.agent.handleNetworkCall(method, url, status);

      if (!this.captureActive || !info) {
        return;
      }

      if (!this.shouldCapture(info, response)) {
        return;
      }

      const call: CapturedCall = {
        method,
        url,
        status,
        requestHeaders: info.headers,
        responseHeaders: response.headers(),
        requestBody: this.truncate(info.postData || undefined),
        responseBody: await this.safeResponseBody(response),
        timestamp: Date.now(),
      };

      this.capturedCalls.push(call);
      if (this.onCapture) {
        this.onCapture(call);
      }
    });
  }

  async stop(): Promise<void> {
    // Cleanup handled by page lifecycle
  }

  startCapture(options: { baseUrl: string; includeThirdParty?: boolean }): void {
    this.captureActive = true;
    this.capturedCalls = [];
    this.includeThirdParty = Boolean(options.includeThirdParty);
    this.captureBaseDomain = this.getBaseDomain(options.baseUrl);
  }

  stopCapture(): void {
    this.captureActive = false;
  }

  getCapturedCalls(): CapturedCall[] {
    return [...this.capturedCalls];
  }

  setCaptureListener(listener?: (call: CapturedCall) => void): void {
    this.onCapture = listener;
  }

  getRequests(): RequestInfo[] {
    return Array.from(this.requests.values());
  }

  private shouldCapture(info: RequestInfo, response: Response): boolean {
    const resourceType = info.resourceType;
    if (resourceType !== "xhr" && resourceType !== "fetch") {
      return false;
    }

    if (!this.includeThirdParty && this.captureBaseDomain) {
      const host = new URL(info.url).hostname;
      if (!this.isSameSite(host, this.captureBaseDomain)) {
        return false;
      }
    }

    return true;
  }

  private async safeResponseBody(response: Response): Promise<string | undefined> {
    try {
      const contentType = response.headers()["content-type"] || "";
      if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
        return undefined;
      }
      const text = await response.text();
      return this.truncate(text);
    } catch {
      return undefined;
    }
  }

  private truncate(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (trimmed.length <= 20000) return trimmed;
    return `${trimmed.slice(0, 20000)}…`;
  }

  private getBaseDomain(url: string): string {
    const host = new URL(url).hostname;
    const parts = host.split(".").filter(Boolean);
    if (parts.length <= 2) return host;
    return parts.slice(-2).join(".");
  }

  private isSameSite(host: string, baseDomain: string): boolean {
    return host === baseDomain || host.endsWith(`.${baseDomain}`);
  }
}
