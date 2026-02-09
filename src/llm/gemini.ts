/**
 * Gemini Flash Vision integration
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getUIIntentPrompt,
  getActionLabelPrompt,
  getFlowAnalysisPrompt,
  getWelcomeMessagePrompt,
  getInitialActionSuggestionsPrompt,
  getPageSummaryPrompt,
  getUserInstructionPrompt,
  getCannotActPrompt,
  getApiDocPrompt,
  getExplorationPageInsightPrompt,
  getExplorationPlanPrompt,
  getExplorationSummaryPrompt,
} from "./prompts.js";

export class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GEMINI_API_KEY environment variable is required. Get one from https://makersuite.google.com/app/apikey",
      );
    }
    this.client = new GoogleGenerativeAI(key);
    // Use Gemini Flash with vision capabilities
    this.model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async analyzeUIIntent(screenshot: Buffer, networkCalls: any[]): Promise<any> {
    try {
      const prompt = getUIIntentPrompt(screenshot, networkCalls);

      // Convert screenshot to base64
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();

      // Try to parse JSON response
      try {
        return JSON.parse(text);
      } catch {
        // If not JSON, return as text
        return { analysis: text };
      }
    } catch (error) {
      return { error: "LLM request failed" };
    }
  }

  async labelAction(screenshot: Buffer, action: string): Promise<string> {
    try {
      const prompt = getActionLabelPrompt(screenshot, action);
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      return action; // Fallback to original action
    }
  }

  async analyzeFlow(flowSteps: any[]): Promise<any> {
    try {
      const prompt = getFlowAnalysisPrompt(flowSteps);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text);
      } catch {
        return { analysis: text };
      }
    } catch (error) {
      return { error: "LLM request failed" };
    }
  }

  async getWelcomeMessage(): Promise<string> {
    try {
      const prompt = getWelcomeMessagePrompt();
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const message = response.text().trim().replace(/\s+/g, " ");
      if (!message) {
        return "Hello! I'm ready to observe UI actions and network calls, with human approvals for anything sensitive.";
      }
      return message;
    } catch {
      return "Hello! I'm ready to observe UI actions and network calls, with human approvals for anything sensitive.";
    }
  }

  async getPageSummary(
    screenshot: Buffer,
    url: string,
    context: {
      title: string;
      headings: string[];
      buttons: string[];
      links: string[];
    },
  ): Promise<{ summary: string; question: string }> {
    try {
      const prompt = getPageSummaryPrompt(url, context);
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      const summary =
        typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
      const question =
        typeof parsed?.question === "string" ? parsed.question.trim() : "";
      const isGeneric =
        /viewing a web page|web page/i.test(summary) || summary.length < 20;

      if (!summary || !question || isGeneric) {
        return this.buildFallbackSummary(context);
      }

      return { summary, question };
    } catch {
      return this.buildFallbackSummary(context);
    }
  }

  private buildFallbackSummary(context: {
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
  }): { summary: string; question: string } {
    const title = context.title || "this page";
    const heading = context.headings[0]
      ? `Headings like "${context.headings[0]}"`
      : "No visible headings";
    const button = context.buttons[0]
      ? `Buttons like "${context.buttons[0]}"`
      : "no obvious buttons";
    const link = context.links[0]
      ? `links like "${context.links[0]}"`
      : "no obvious links";

    return {
      summary: `You're on "${title}". ${heading} are visible, with ${button} and ${link}. Likely next actions include signing in, exploring content, or navigating to a section.`,
      question:
        "Should I suggest actions to perform, or focus on network logs only?",
    };
  }

  async suggestInitialActions(
    screenshot: Buffer,
  ): Promise<{ actions: { action: string; reason?: string }[] }> {
    try {
      const prompt = getInitialActionSuggestionsPrompt();
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      if (!parsed || !Array.isArray(parsed.actions)) {
        return { actions: [] };
      }

      const actions = parsed.actions
        .filter((item: any) => item && typeof item.action === "string")
        .map((item: any) => ({
          action: item.action.trim(),
          reason:
            typeof item.reason === "string" ? item.reason.trim() : undefined,
        }))
        .filter((item: any) => item.action.length > 0);

      return { actions };
    } catch {
      return { actions: [] };
    }
  }

  async interpretUserInstruction(
    screenshot: Buffer,
    url: string,
    context: {
      title: string;
      headings: string[];
      buttons: string[];
      links: string[];
    },
    instruction: string,
  ): Promise<{
    type: "click" | "type" | "press" | "navigate" | "";
    action?: string;
    target?: string;
    value?: string;
    key?: string;
    url?: string;
    submit?: boolean;
    reason?: string;
  }> {
    try {
      const prompt = getUserInstructionPrompt(url, context, instruction);
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);
      const type = typeof parsed?.type === "string" ? parsed.type.trim() : "";
      return {
        type: type as "click" | "type" | "press" | "navigate" | "",
        action:
          typeof parsed?.action === "string" ? parsed.action.trim() : undefined,
        target:
          typeof parsed?.target === "string" ? parsed.target.trim() : undefined,
        value:
          typeof parsed?.value === "string" ? parsed.value.trim() : undefined,
        key: typeof parsed?.key === "string" ? parsed.key.trim() : undefined,
        url: typeof parsed?.url === "string" ? parsed.url.trim() : undefined,
        submit: typeof parsed?.submit === "boolean" ? parsed.submit : undefined,
        reason:
          typeof parsed?.reason === "string" ? parsed.reason.trim() : undefined,
      };
    } catch {
      return this.fallbackPlanFromInstruction(instruction);
    }
  }

  async getCannotActMessage(
    screenshot: Buffer,
    url: string,
    context: {
      title: string;
      headings: string[];
      buttons: string[];
      links: string[];
    },
    instruction: string,
  ): Promise<string> {
    try {
      const prompt = getCannotActPrompt(url, context, instruction);
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);
      const message =
        typeof parsed?.message === "string" ? parsed.message.trim() : "";
      if (message.length > 0) {
        return message;
      }
      return this.buildCannotActFallback(context, instruction);
    } catch {
      return this.buildCannotActFallback(context, instruction);
    }
  }

  private fallbackPlanFromInstruction(instruction: string): {
    type: "click" | "type" | "press" | "navigate" | "";
    action?: string;
    target?: string;
    value?: string;
    key?: string;
    url?: string;
    submit?: boolean;
    reason?: string;
  } {
    const lower = instruction.toLowerCase();
    const emailMatch = instruction.match(
      /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
    );
    if (emailMatch) {
      return {
        type: "type",
        target: "email",
        value: emailMatch[1],
        submit: false,
        reason: "Detected an email address in the instruction.",
      };
    }

    const passwordMatch =
      lower.match(/password\s+is\s+([^\s]+)/i) ||
      lower.match(/type\s+([^\s]+)\s+in\s+password/i);
    if (passwordMatch && passwordMatch[1]) {
      return {
        type: "type",
        target: "password",
        value: passwordMatch[1],
        submit: false,
        reason: "Detected a password instruction.",
      };
    }

    const urlMatch = instruction.match(
      /((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?)/i,
    );
    if (/(go to|open|navigate)\s+/i.test(lower) && urlMatch) {
      return {
        type: "navigate",
        url: urlMatch[1],
        reason: "Instruction appears to be navigation.",
      };
    }
    if (urlMatch && !/\s/.test(urlMatch[1])) {
      return {
        type: "navigate",
        url: urlMatch[1],
        reason: "Detected a URL in the instruction.",
      };
    }
    const inFieldMatch = instruction.match(/type\s+(.+?)\s+in\s+(.+)/i);
    if (inFieldMatch && inFieldMatch[1] && inFieldMatch[2]) {
      return {
        type: "type",
        target: inFieldMatch[2].trim(),
        value: inFieldMatch[1].trim(),
        submit: false,
        reason: "Instruction specifies a field to type into.",
      };
    }

    const searchMatch =
      lower.match(/search(?:\s+for)?\s+(.+)/i) ||
      lower.match(/type\s+(.+?)\s+in\s+the\s+search/i) ||
      lower.match(/type\s+(.+?)$/i);

    if (searchMatch && searchMatch[1]) {
      return {
        type: "type",
        target: "search",
        value: searchMatch[1].trim(),
        submit: true,
        reason: "Instruction appears to be a search.",
      };
    }

    if (
      /(first\s+video|first\s+result|first\s+item|first\s+image|first\s+thumbnail|play\s+first)/i.test(
        lower,
      )
    ) {
      return {
        type: "click",
        action: "first video",
        reason: "Instruction asks for the first result.",
      };
    }

    if (lower.includes("press enter")) {
      return {
        type: "press",
        key: "Enter",
        reason: "Instruction asks to press Enter.",
      };
    }

    if (/(log\s*in|login|sign\s*in)/i.test(lower)) {
      return {
        type: "click",
        action: "Log in",
        reason: "Instruction implies login/sign-in.",
      };
    }

    return {
      type: "",
      action: "",
      reason: "LLM could not interpret the instruction.",
    };
  }

  private buildCannotActFallback(
    context: {
      title: string;
      headings: string[];
      buttons: string[];
      links: string[];
    },
    instruction: string,
  ): string {
    const parts: string[] = [];
    const title = context.title || "this page";
    parts.push(
      `Sorry — I couldn't find a visible control to "${instruction}".`,
    );
    parts.push(`I can see "${title}" with`);
    const details: string[] = [];
    if (context.headings.length > 0)
      details.push(`headings like "${context.headings[0]}"`);
    if (context.buttons.length > 0)
      details.push(`buttons like "${context.buttons[0]}"`);
    if (context.links.length > 0)
      details.push(`links like "${context.links[0]}"`);
    if (details.length === 0)
      details.push("no obvious headings, buttons, or links");
    parts.push(details.join(", ") + ".");
    parts.push("Try telling me exactly which button or link to click.");
    return parts.join(" ");
  }

  async getExplorationPlan(
    screenshot: Buffer,
    url: string,
    context: {
      title: string;
      headings: string[];
      buttons: string[];
      links: string[];
    },
    candidates: { label: string; href?: string; type: string }[],
  ): Promise<{
    appOverview: string;
    domain: string;
    prioritizedPages: {
      label: string;
      priority: "high" | "medium" | "low";
      reason: string;
      expectedApis: string;
    }[];
    skipReasons: { label: string; reason: string }[];
    expectedEntities: string[];
  }> {
    try {
      const prompt = getExplorationPlanPrompt(url, context, candidates);
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      const parsed = JSON.parse(cleaned);
      return {
        appOverview: parsed.appOverview || "Unknown application",
        domain: parsed.domain || "unknown",
        prioritizedPages: Array.isArray(parsed.prioritizedPages)
          ? parsed.prioritizedPages
          : [],
        skipReasons: Array.isArray(parsed.skipReasons)
          ? parsed.skipReasons
          : [],
        expectedEntities: Array.isArray(parsed.expectedEntities)
          ? parsed.expectedEntities
          : [],
      };
    } catch {
      return {
        appOverview: "Could not analyze the application",
        domain: "unknown",
        prioritizedPages: candidates.map((c) => ({
          label: c.label,
          priority: "medium" as const,
          reason: "Default priority — LLM analysis unavailable",
          expectedApis: "unknown",
        })),
        skipReasons: [],
        expectedEntities: [],
      };
    }
  }

  async getExplorationPageInsight(
    screenshot: Buffer,
    pageName: string,
    pageUrl: string,
    context: {
      title: string;
      headings: string[];
      buttons: string[];
      links: string[];
    },
    apisCaptured: { method: string; url: string; status: number }[],
  ): Promise<{
    pageType: string;
    insight: string;
    apisAnalyzed: {
      endpoint: string;
      purpose: string;
      dataType: string;
      notablePatterns: string;
    }[];
    entitiesDiscovered: string[];
    explorationValue: string;
    suggestedDeepDive: string | null;
  }> {
    try {
      const prompt = getExplorationPageInsightPrompt(
        pageName,
        pageUrl,
        context,
        apisCaptured,
      );
      const base64Image = screenshot.toString("base64");

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ]);

      const response = await result.response;
      const text = response.text();
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      const parsed = JSON.parse(cleaned);
      return {
        pageType: parsed.pageType || "unknown",
        insight: parsed.insight || "No insight available.",
        apisAnalyzed: Array.isArray(parsed.apisAnalyzed)
          ? parsed.apisAnalyzed
          : [],
        entitiesDiscovered: Array.isArray(parsed.entitiesDiscovered)
          ? parsed.entitiesDiscovered
          : [],
        explorationValue: parsed.explorationValue || "medium",
        suggestedDeepDive: parsed.suggestedDeepDive || null,
      };
    } catch {
      return {
        pageType: "unknown",
        insight: `Visited "${pageName}" — ${apisCaptured.length} API call(s) captured.`,
        apisAnalyzed: [],
        entitiesDiscovered: [],
        explorationValue: "medium",
        suggestedDeepDive: null,
      };
    }
  }

  async getExplorationSummary(
    baseUrl: string,
    pagesVisited: {
      name: string;
      url: string;
      apis: { method: string; url: string; status: number }[];
    }[],
    totalUniqueApis: number,
  ): Promise<{
    appName: string;
    appDomain: string;
    summary: string;
    topFindings: string[];
    coveragePercent: string;
    unexploredAreas: string[];
    recommendations: string[];
  }> {
    try {
      const prompt = getExplorationSummaryPrompt(
        baseUrl,
        pagesVisited,
        totalUniqueApis,
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      const parsed = JSON.parse(cleaned);
      return {
        appName: parsed.appName || "Unknown",
        appDomain: parsed.appDomain || "unknown",
        summary: parsed.summary || "Exploration complete.",
        topFindings: Array.isArray(parsed.topFindings)
          ? parsed.topFindings
          : [],
        coveragePercent: parsed.coveragePercent || "unknown",
        unexploredAreas: Array.isArray(parsed.unexploredAreas)
          ? parsed.unexploredAreas
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],
      };
    } catch {
      return {
        appName: "Unknown",
        appDomain: "unknown",
        summary: `Explored ${pagesVisited.length} pages, discovered ${totalUniqueApis} unique API endpoints.`,
        topFindings: [],
        coveragePercent: "unknown",
        unexploredAreas: [],
        recommendations: [],
      };
    }
  }

  async generateApiDocumentation(
    calls: {
      method: string;
      url: string;
      status: number;
      requestHeaders: Record<string, string>;
      responseHeaders: Record<string, string>;
      requestBody?: string;
      responseBody?: string;
    }[],
    baseUrl: string,
  ): Promise<string> {
    try {
      const trimmed = calls.slice(0, 60).map((call) => ({
        method: call.method,
        url: call.url,
        status: call.status,
        requestHeaders: this.pickHeaders(call.requestHeaders),
        responseHeaders: this.pickHeaders(call.responseHeaders),
        requestBody: call.requestBody,
        responseBody: call.responseBody,
      }));
      const callsJson = JSON.stringify(trimmed, null, 2);
      const prompt = getApiDocPrompt(baseUrl, callsJson);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch {
      return this.buildApiDocFallback(calls, baseUrl);
    }
  }

  private pickHeaders(headers: Record<string, string>): Record<string, string> {
    const allowlist = [
      "content-type",
      "authorization",
      "x-api-key",
      "x-request-id",
      "set-cookie",
      "cookie",
    ];
    const result: Record<string, string> = {};
    for (const key of Object.keys(headers || {})) {
      const lower = key.toLowerCase();
      if (allowlist.includes(lower)) {
        result[lower] = "<redacted>";
      }
    }
    return result;
  }

  private buildApiDocFallback(
    calls: {
      method: string;
      url: string;
      status: number;
      requestHeaders?: Record<string, string>;
      responseHeaders?: Record<string, string>;
    }[],
    baseUrl: string,
  ): string {
    const lines: string[] = [];
    lines.push("# API Documentation");
    lines.push("");
    lines.push(`Base URL: ${baseUrl}`);
    lines.push("");
    lines.push("## Endpoints");
    const groups = new Map<
      string,
      {
        method: string;
        path: string;
        requestHeaders: Set<string>;
        responseHeaders: Set<string>;
        status: number;
      }
    >();
    for (const call of calls) {
      const path = this.safePath(call.url);
      const key = `${call.method} ${path}`;
      if (!groups.has(key)) {
        groups.set(key, {
          method: call.method,
          path,
          requestHeaders: new Set<string>(),
          responseHeaders: new Set<string>(),
          status: call.status,
        });
      }
      const group = groups.get(key)!;
      const reqHeaders = call.requestHeaders || {};
      const resHeaders = call.responseHeaders || {};
      Object.keys(reqHeaders).forEach((h) =>
        group.requestHeaders.add(h.toLowerCase()),
      );
      Object.keys(resHeaders).forEach((h) =>
        group.responseHeaders.add(h.toLowerCase()),
      );
    }

    for (const group of groups.values()) {
      lines.push(
        `- \`${group.method} ${group.path}\` (status ${group.status})`,
      );
      const reqList = Array.from(group.requestHeaders).sort();
      const resList = Array.from(group.responseHeaders).sort();
      lines.push(
        `  - Request headers: ${reqList.length > 0 ? reqList.join(", ") : "Not observed"}`,
      );
      lines.push(
        `  - Response headers: ${resList.length > 0 ? resList.join(", ") : "Not observed"}`,
      );
    }
    return lines.join("\n");
  }

  private safePath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}
