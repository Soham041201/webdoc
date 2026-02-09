#!/usr/bin/env bun

/**
 * WebDoc Agent CLI Entry Point
 */

import React from "react";
import { render } from "ink";
import { mkdir } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { Agent } from "./agent/Agent.js";
import type { AgentEvent } from "./agent/Events.js";
import { BrowserController } from "./browser/playwright.js";
import type { CapturedCall } from "./browser/networkRecorder.js";
import { App } from "./cli/App.js";
import { exportToMarkdown } from "./export/markdown.js";
import { exportCallsToOpenAPI, type DocMetadata } from "./export/openapi.js";
import { GeminiClient } from "./llm/gemini.js";

function showHelp() {
  console.log(`
WebDoc Agent - Human-in-the-loop API documentation agent

Usage:
  webdoc [command] [options]

Commands:
  open <url>           Open a URL and start documenting
  help                 Show this help message
  version              Show version number

Options:
  --docs-path <path>    Custom path for documentation files (relative to current directory, default: ./docs)
  -d <path>             Short form of --docs-path

Examples:
  webdoc open https://example.com
  webdoc open https://dashboard.example.com
  webdoc open https://example.com --docs-path ./api-docs
  webdoc open https://example.com -d ./custom-docs
  webdoc open https://example.com --docs-path /absolute/path/to/docs

Interactive Commands (while running):
  y                    Approve action
  n                    Skip action
  d                    Document only (don't execute)
  Ctrl+C               Quit

Environment Variables:
  GEMINI_API_KEY       Required: Your Gemini API key
  WEBDOC_DOCS_PATH     Custom path for documentation files (relative to current directory, default: ./docs)

For more information, visit: https://github.com/Soham041201/webdoc
`);
}

async function showVersion() {
  // Bun can read package.json directly
  try {
    const pkg = Bun.file("package.json");
    const pkgJson = JSON.parse(await pkg.text());
    console.log(`webdoc-agent v${pkgJson.version}`);
  } catch {
    console.log("webdoc-agent v0.1.0");
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  // Add https:// if no protocol specified
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function parseDocsPath(args: string[]): string {
  let rawPath: string | undefined;

  // Check for --docs-path or -d flag
  const docsPathIndex = args.findIndex(
    (arg, i) => (arg === "--docs-path" || arg === "-d") && i + 1 < args.length,
  );
  if (docsPathIndex !== -1) {
    rawPath = args[docsPathIndex + 1];
  } else {
    // Fall back to environment variable
    rawPath = process.env.WEBDOC_DOCS_PATH;
  }

  // Default to "docs" if nothing specified
  const pathToResolve = rawPath || "docs";

  // Resolve path: if absolute, use as-is; if relative, resolve from cwd
  // This ensures files are written relative to where the user runs the command
  // (not relative to the package installation directory)
  const resolvedPath = isAbsolute(pathToResolve)
    ? pathToResolve
    : resolve(process.cwd(), pathToResolve);

  // Safety check: warn if trying to write to node_modules or package directory
  const normalizedPath = resolve(resolvedPath).toLowerCase();
  if (
    normalizedPath.includes("node_modules") ||
    normalizedPath.includes("\\node_modules") ||
    normalizedPath.includes("/node_modules")
  ) {
    console.warn(
      "Warning: Writing to node_modules is not recommended. Files will be written, but consider using a different path.",
    );
  }

  return resolvedPath;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Handle help and version
  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    showHelp();
    process.exit(0);
  }

  if (command === "version" || command === "--version" || command === "-v") {
    await showVersion();
    process.exit(0);
  }

  // Parse docs path (before command-specific parsing)
  const docsPath = parseDocsPath(args);

  // Initialize agent
  const agent = new Agent();

  // Handle commands
  if (command === "open") {
    // Filter out docs-path related args for URL parsing
    const filteredArgs = args.filter(
      (arg, i) =>
        arg !== "--docs-path" &&
        arg !== "-d" &&
        !(i > 0 && (args[i - 1] === "--docs-path" || args[i - 1] === "-d")),
    );
    const urlArg = filteredArgs[1];
    if (!urlArg) {
      console.error("Error: URL is required");
      console.error("Usage: webdoc open <url>");
      process.exit(1);
    }

    const url = normalizeUrl(urlArg);
    if (!isValidUrl(url)) {
      console.error(`Error: Invalid URL: ${urlArg}`);
      console.error("Please provide a valid HTTP or HTTPS URL");
      process.exit(1);
    }

    await runAgent(agent, url, docsPath);
  } else if (command === "export") {
    const format = args[1];
    if (format === "md" || format === "markdown") {
      // Export markdown (would need to load flows from storage)
      console.log("Export markdown - not yet implemented");
      process.exit(0);
    } else if (format === "openapi" || format === "open-api") {
      // Export OpenAPI (would need to load flows from storage)
      console.log("Export OpenAPI - not yet implemented");
      process.exit(0);
    } else {
      console.error("Error: Invalid export format");
      console.error("Usage: webdoc export [md|openapi]");
      process.exit(1);
    }
  } else {
    // Unknown command - show help
    console.error(`Error: Unknown command: ${command}`);
    console.error("");
    showHelp();
    process.exit(1);
  }
}

async function startCLI(agent: Agent, initialEvents: AgentEvent[]) {
  render(<App agent={agent} initialEvents={initialEvents} />);
}

async function runAgent(
  agent: Agent,
  url: string,
  docsPath: string = resolve(process.cwd(), "docs"),
) {
  let browser: BrowserController | null = null;
  let captureActive = false;
  let captureTimer: ReturnType<typeof setTimeout> | null = null;
  let exploring = false;
  const sessionStartTime = Date.now();

  // ── Single session-level accumulator ──
  // All unique API calls across the entire session go here.
  // ONE .md and ONE .json are written at the end — no rolling batches.
  let captureUniqueKeys = new Set<string>();
  let sessionCalls: CapturedCall[] = [];
  let pagesExploredNames: string[] = [];

  try {
    // Initialize Gemini client
    const gemini = new GeminiClient();

    const welcomeMessage = await gemini.getWelcomeMessage();
    const initialEvents: AgentEvent[] = [
      { type: "info", message: "WebDoc Agent started" },
      { type: "info", message: "Press Ctrl+C to quit" },
      { type: "info", message: `LLM welcome: ${welcomeMessage}` },
    ];

    // Launch browser
    agent.emit({ type: "info", message: "Launching browser..." });
    browser = new BrowserController(agent);
    await browser.launch();

    // Navigate to URL
    agent.emit({ type: "info", message: `Navigating to ${url}...` });
    await browser.navigate(url);

    // Start CLI
    startCLI(agent, initialEvents);

    const scheduleCaptureFinalize = () => {
      if (exploring) return;
      if (captureTimer) {
        clearTimeout(captureTimer);
      }
      captureTimer = setTimeout(() => {
        void finalizeCapture("No new API activity detected.");
      }, 8000);
    };

    const buildMetadata = (): DocMetadata => {
      const elapsed = Date.now() - sessionStartTime;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      return {
        capturedAt: new Date().toISOString(),
        sourceUrl: url,
        totalCalls: sessionCalls.length,
        uniqueEndpoints: captureUniqueKeys.size,
        pagesExplored:
          pagesExploredNames.length > 0 ? pagesExploredNames : undefined,
        sessionDuration: `${mins}m ${secs}s`,
      };
    };

    const writeDocs = async (calls: CapturedCall[], reason: string) => {
      if (calls.length === 0) {
        agent.emit({ type: "info", message: "No API calls captured yet." });
        return;
      }

      agent.emit({
        type: "llm_status",
        status: "thinking",
        message: "Generating API documentation...",
      });
      const markdown = await gemini.generateApiDocumentation(calls, url);
      agent.emit({ type: "llm_status", status: "idle" });

      const apiHost = getPrimaryHost(calls) || new URL(url).hostname;
      const apiOrigin = getPrimaryOrigin(calls) || new URL(url).origin;
      const slug = apiHost
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      // Files are written to the user's current working directory (where they run the command),
      // NOT to the package installation directory. This is the correct behavior for CLI tools.
      // docsPath is already resolved relative to process.cwd() in parseDocsPath()
      await mkdir(docsPath, { recursive: true });

      // Single file per host — clean names, no timestamps or part suffixes
      // Use resolve to ensure proper path separators across platforms
      const mdPath = resolve(docsPath, `${slug}-api.md`);
      const swaggerPath = resolve(docsPath, `${slug}-openapi.json`);

      // Add metadata frontmatter to the markdown
      const metadata = buildMetadata();
      const frontmatter = [
        "---",
        `title: "${apiHost} API Documentation"`,
        `source: "${url}"`,
        `generated: "${metadata.capturedAt}"`,
        `total_calls: ${metadata.totalCalls}`,
        `unique_endpoints: ${metadata.uniqueEndpoints}`,
        `session_duration: "${metadata.sessionDuration}"`,
        ...(metadata.pagesExplored
          ? [
              `pages_explored:\n${metadata.pagesExplored.map((p) => `  - "${p}"`).join("\n")}`,
            ]
          : []),
        `generator: "WebDoc Agent"`,
        "---",
        "",
      ].join("\n");

      await Bun.write(mdPath, frontmatter + markdown);

      const swagger = exportCallsToOpenAPI(calls, apiOrigin, metadata);
      await Bun.write(swaggerPath, JSON.stringify(swagger, null, 2));

      agent.emit({
        type: "info",
        message: `Documentation written (${calls.length} calls, ${captureUniqueKeys.size} unique endpoints) → ${mdPath} + ${swaggerPath}`,
      });
    };

    const finalizeCapture = async (reason: string) => {
      if (!captureActive || !browser) return;
      captureActive = false;
      if (captureTimer) {
        clearTimeout(captureTimer);
        captureTimer = null;
      }
      browser.stopCapture();
      browser.setCaptureListener(undefined);

      await writeDocs(sessionCalls, reason);
    };

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const getPrimaryHost = (calls: { url: string }[]) => {
      const counts = new Map<string, number>();
      for (const call of calls) {
        try {
          const host = new URL(call.url).hostname;
          counts.set(host, (counts.get(host) || 0) + 1);
        } catch {
          // ignore invalid URLs
        }
      }
      let topHost = "";
      let topCount = 0;
      for (const [host, count] of counts.entries()) {
        if (count > topCount) {
          topHost = host;
          topCount = count;
        }
      }
      return topHost || null;
    };

    const getPrimaryOrigin = (calls: { url: string }[]) => {
      const counts = new Map<string, number>();
      for (const call of calls) {
        try {
          const origin = new URL(call.url).origin;
          counts.set(origin, (counts.get(origin) || 0) + 1);
        } catch {
          // ignore invalid URLs
        }
      }
      let topOrigin = "";
      let topCount = 0;
      for (const [origin, count] of counts.entries()) {
        if (count > topCount) {
          topOrigin = origin;
          topCount = count;
        }
      }
      return topOrigin || null;
    };

    const getApiKey = (call: { method: string; url: string }) => {
      try {
        const parsed = new URL(call.url);
        return `${call.method} ${parsed.hostname}${parsed.pathname}`;
      } catch {
        return `${call.method} ${call.url}`;
      }
    };

    // Shared capture listener — accumulates unique calls into the session
    const onCapturedCall = (call: CapturedCall) => {
      const key = getApiKey(call);
      if (!captureUniqueKeys.has(key)) {
        captureUniqueKeys.add(key);
        sessionCalls.push(call);
      }
    };

    const startCaptureSession = () => {
      if (captureActive || !browser) return;
      captureActive = true;
      browser.startCapture(url);
      browser.setCaptureListener(onCapturedCall);
    };

    const isUnsafeLabel = (label: string) =>
      /(logout|sign\s*out|delete|remove|unsubscribe|checkout|payment|order|purchase|buy)/i.test(
        label,
      );

    const isRiskyNavigation = (candidate: { label: string; href?: string }) => {
      if (isUnsafeLabel(candidate.label)) return true;
      if (!candidate.href) return false;
      try {
        const targetHost = new URL(candidate.href).hostname;
        const baseHost = new URL(url).hostname;
        if (targetHost !== baseHost && !targetHost.endsWith(`.${baseHost}`)) {
          return true;
        }
      } catch {
        return true;
      }
      return false;
    };

    const exploreVisiblePages = async () => {
      if (!browser) return;
      exploring = true;

      const baseUrl = browser.getPage()?.url() || url;
      const candidates = await browser.getNavigationCandidates();

      if (candidates.length === 0) {
        agent.emit({
          type: "info",
          message: "No visible navigation items found.",
        });
        exploring = false;
        return;
      }

      // ── Phase 1: Pre-exploration LLM analysis ──
      agent.emit({
        type: "llm_status",
        status: "thinking",
        message: "Analyzing navigation candidates and planning exploration...",
      });

      const screenshot = await browser.takeScreenshot();
      const pageContext = await browser.getPageContext();
      const plan = await gemini.getExplorationPlan(
        screenshot,
        baseUrl,
        pageContext,
        candidates,
      );
      agent.emit({ type: "llm_status", status: "idle" });

      // Show the exploration plan
      agent.emit({
        type: "info",
        message: `Application: ${plan.appOverview} (${plan.domain})`,
      });

      if (plan.expectedEntities.length > 0) {
        agent.emit({
          type: "info",
          message: `Expected entities: ${plan.expectedEntities.join(", ")}`,
        });
      }

      const highPriority = plan.prioritizedPages.filter(
        (p) => p.priority === "high",
      );
      const medPriority = plan.prioritizedPages.filter(
        (p) => p.priority === "medium",
      );
      if (highPriority.length > 0) {
        agent.emit({
          type: "info",
          message: `High-priority pages: ${highPriority.map((p) => `"${p.label}"`).join(", ")}`,
        });
      }

      // Build a priority-ordered list from LLM analysis
      const skipLabels = new Set(
        plan.skipReasons.map((s) => s.label.toLowerCase()),
      );
      const priorityOrder = [
        ...plan.prioritizedPages.filter((p) => p.priority === "high"),
        ...plan.prioritizedPages.filter((p) => p.priority === "medium"),
        ...plan.prioritizedPages.filter((p) => p.priority === "low"),
      ];

      // Map prioritized labels back to actual candidates
      const orderedCandidates: typeof candidates = [];
      const usedLabels = new Set<string>();
      for (const pp of priorityOrder) {
        const match = candidates.find(
          (c) =>
            c.label.toLowerCase() === pp.label.toLowerCase() &&
            !usedLabels.has(c.label.toLowerCase()),
        );
        if (match) {
          orderedCandidates.push(match);
          usedLabels.add(match.label.toLowerCase());
        }
      }
      // Add any remaining candidates not in the LLM plan
      for (const c of candidates) {
        if (!usedLabels.has(c.label.toLowerCase())) {
          orderedCandidates.push(c);
          usedLabels.add(c.label.toLowerCase());
        }
      }

      // ── Phase 2: Visit pages with per-page insight ──
      const visited = new Set<string>();
      let explored = 0;
      const pagesVisitedData: {
        name: string;
        url: string;
        apis: { method: string; url: string; status: number }[];
      }[] = [];
      const allDiscoveredEntities = new Set<string>();

      const capturedBefore = () =>
        browser ? browser.getCapturedCalls().length : 0;

      for (const candidate of orderedCandidates) {
        if (explored >= 8) break;
        if (isUnsafeLabel(candidate.label)) continue;
        if (
          skipLabels.has(candidate.label.toLowerCase()) &&
          !isRiskyNavigation(candidate)
        ) {
          agent.emit({
            type: "info",
            message: `Skipping "${candidate.label}" (low API value).`,
          });
          continue;
        }
        if (candidate.href && visited.has(candidate.href)) continue;

        if (isRiskyNavigation(candidate)) {
          const decision = await agent.requestActionDecision({
            action: `Open "${candidate.label}"`,
            reason: candidate.href ? candidate.href : "Visible button",
          });
          if (decision !== "yes") continue;
        }

        // Track API calls before navigation
        const callCountBefore = capturedBefore();

        agent.emit({
          type: "info",
          message: `Exploring "${candidate.label}"...`,
        });

        let pageUrl = baseUrl;
        try {
          if (candidate.href) {
            await browser.navigateSoft(candidate.href);
            visited.add(candidate.href);
            pageUrl = candidate.href;
          } else {
            await browser.performSuggestedAction(candidate.label);
            pageUrl = browser.getPage()?.url() || baseUrl;
          }
        } catch {
          agent.emit({
            type: "info",
            message: `Navigation failed for "${candidate.label}". Skipping.`,
          });
          continue;
        }

        explored += 1;
        await sleep(1500); // Wait for APIs to fire

        // Capture what happened on this page
        const allCalls = browser.getCapturedCalls();
        const newCalls = allCalls.slice(callCountBefore);
        const pageApis = newCalls.map((c) => ({
          method: c.method,
          url: c.url,
          status: c.status,
        }));

        // Take screenshot and get page context for LLM analysis
        const pageScreenshot = await browser.takeScreenshot();
        const currentContext = await browser.getPageContext();

        // Get per-page LLM insight
        agent.emit({
          type: "llm_status",
          status: "thinking",
          message: `Analyzing "${candidate.label}"...`,
        });
        const pageInsight = await gemini.getExplorationPageInsight(
          pageScreenshot,
          candidate.label,
          pageUrl,
          currentContext,
          pageApis,
        );
        agent.emit({ type: "llm_status", status: "idle" });

        // Store page data for final summary and session metadata
        pagesVisitedData.push({
          name: candidate.label,
          url: pageUrl,
          apis: pageApis,
        });
        pagesExploredNames.push(candidate.label);

        // Track discovered entities
        for (const entity of pageInsight.entitiesDiscovered) {
          allDiscoveredEntities.add(entity);
        }

        // Emit the rich per-page insight
        const apiNames =
          pageApis.length > 0
            ? pageApis.map((a) => {
                try {
                  return `${a.method} ${new URL(a.url).pathname}`;
                } catch {
                  return `${a.method} ${a.url}`;
                }
              })
            : undefined;

        agent.emit({
          type: "exploration_insight",
          page: candidate.label,
          apisFound: pageApis.length,
          insight: pageInsight.insight,
          apis: apiNames,
        });

        // Navigate back
        await browser.goBackOrNavigate(baseUrl);
        await sleep(800);
      }

      // ── Phase 3: Post-exploration summary ──
      const totalUnique = captureUniqueKeys.size;

      if (pagesVisitedData.length > 0) {
        agent.emit({
          type: "llm_status",
          status: "thinking",
          message: "Synthesizing exploration findings...",
        });
        const summaryResult = await gemini.getExplorationSummary(
          baseUrl,
          pagesVisitedData,
          totalUnique,
        );
        agent.emit({ type: "llm_status", status: "idle" });

        agent.emit({
          type: "exploration_summary",
          totalPages: pagesVisitedData.length,
          totalApis: totalUnique,
          summary: summaryResult.summary,
          topFindings: summaryResult.topFindings,
        });

        if (summaryResult.recommendations.length > 0) {
          agent.emit({
            type: "info",
            message: `Recommendations: ${summaryResult.recommendations.join(" | ")}`,
          });
        }

        if (summaryResult.unexploredAreas.length > 0) {
          agent.emit({
            type: "info",
            message: `Unexplored areas: ${summaryResult.unexploredAreas.join(", ")}`,
          });
        }
      }

      exploring = false;
    };

    const handleUserPrompt = async (event: AgentEvent) => {
      if (event.type !== "user_prompt") return;
      if (!browser) return;
      const promptLower = event.prompt.toLowerCase();

      if (promptLower.startsWith("/capture")) {
        const arg = promptLower.split(/\s+/)[1];
        if (!arg || arg === "on" || arg === "start") {
          if (!captureActive) {
            startCaptureSession();
            agent.emit({
              type: "info",
              message: `Capture enabled. ${sessionCalls.length > 0 ? `${sessionCalls.length} calls already in session.` : ""} Type /capture off to generate docs.`,
            });
          } else {
            agent.emit({
              type: "info",
              message: "Capture is already running.",
            });
          }
        } else if (arg === "off" || arg === "stop") {
          if (captureActive) {
            await finalizeCapture("Capture stopped by user.");
          } else {
            agent.emit({ type: "info", message: "Capture is not running." });
          }
        } else {
          agent.emit({
            type: "info",
            message: "Usage: /capture on|off",
          });
        }
        return;
      }

      if (
        /(i'?m logged in|i am logged in|logged in|login complete|signed in)/i.test(
          promptLower,
        )
      ) {
        if (!captureActive) {
          startCaptureSession();
          scheduleCaptureFinalize();
          agent.emit({
            type: "info",
            message:
              "Login confirmed. Capturing API calls. Docs will generate after activity settles, or type /capture off.",
          });
        } else {
          agent.emit({ type: "info", message: "Capture is already running." });
        }
        return;
      }

      if (
        /(stop capture|generate docs|document api|create docs)/i.test(
          promptLower,
        )
      ) {
        await finalizeCapture("Requested by user.");
        return;
      }

      if (
        /(explore|crawl|surf pages|discover pages|find pages|explore site)/i.test(
          promptLower,
        )
      ) {
        if (!captureActive) {
          startCaptureSession();
        }

        await exploreVisiblePages();
        await finalizeCapture("Exploration complete.");
        return;
      }

      const screenshot = await browser.takeScreenshot();
      const context = await browser.getPageContext();

      if (
        /(what can you see|what do you see|describe|summarize|summary|what is on|what's on)/i.test(
          promptLower,
        )
      ) {
        agent.emit({
          type: "llm_status",
          status: "thinking",
          message: "Summarizing the page...",
        });
        const summary = await gemini.getPageSummary(screenshot, url, context);
        agent.emit({ type: "llm_status", status: "idle" });
        agent.emit({
          type: "info",
          message: `Summary: ${summary.summary}`,
        });
        agent.emit({
          type: "info",
          message: summary.question || "What would you like to do next?",
        });
        return;
      }

      agent.emit({
        type: "llm_status",
        status: "thinking",
        message: "Planning your action...",
      });
      const plan = await gemini.interpretUserInstruction(
        screenshot,
        url,
        context,
        event.prompt,
      );
      agent.emit({ type: "llm_status", status: "idle" });

      if (
        !plan.type ||
        (plan.type === "click" && !plan.action) ||
        (plan.type === "type" && !plan.value) ||
        (plan.type === "press" && !plan.key) ||
        (plan.type === "navigate" && !plan.url)
      ) {
        agent.emit({
          type: "llm_status",
          status: "thinking",
          message: "Explaining what I can see...",
        });
        const cannotActMessage = await gemini.getCannotActMessage(
          screenshot,
          url,
          context,
          event.prompt,
        );
        agent.emit({ type: "llm_status", status: "idle" });
        agent.emit({
          type: "info",
          message: cannotActMessage,
        });
        return;
      }

      agent.emit({
        type: "info",
        message: `Planned action: ${plan.type} ${
          plan.type === "click"
            ? `"${plan.action}"`
            : plan.type === "type"
              ? `"${plan.value}"${plan.target ? ` into ${plan.target}` : ""}`
              : plan.type === "navigate"
                ? `${plan.url}`
                : plan.key || ""
        }${plan.reason ? ` (${plan.reason})` : ""}`,
      });

      const result = await browser.performPlannedAction(plan);
      agent.emit({
        type: "info",
        message: result.ok
          ? `Action executed: ${result.message}`
          : `Action failed: ${result.message}`,
      });

      agent.emit({
        type: "llm_status",
        status: "thinking",
        message: "Summarizing the new screen...",
      });
      const postScreenshot = await browser.takeScreenshot();
      const postContext = await browser.getPageContext();
      const postSummary = await gemini.getPageSummary(
        postScreenshot,
        url,
        postContext,
      );
      agent.emit({ type: "llm_status", status: "idle" });
      agent.emit({
        type: "info",
        message: `Summary: ${postSummary.summary}`,
      });
    };

    agent.onEvent(handleUserPrompt);

    void (async () => {
      try {
        if (!browser) return;
        const screenshot = await browser.takeScreenshot();
        const context = await browser.getPageContext();
        agent.emit({
          type: "llm_status",
          status: "thinking",
          message: "Analyzing the page...",
        });
        const summary = await gemini.getPageSummary(screenshot, url, context);
        agent.emit({ type: "llm_status", status: "idle" });
        agent.emit({
          type: "info",
          message: `Summary: ${summary.summary}`,
        });
        agent.emit({
          type: "info",
          message: summary.question || "What would you like to do next?",
        });
        agent.emit({
          type: "info",
          message: 'Type a command below. Try: "explore" after login.',
        });
      } catch {
        agent.emit({
          type: "info",
          message: "LLM guidance unavailable for the initial screen.",
        });
      }
    })();

    // Keep running until user quits
    process.on("SIGINT", async () => {
      if (captureActive) {
        await finalizeCapture("Stopped by user.");
      }
      agent.emit({ type: "info", message: "Shutting down..." });
      if (browser) {
        await browser.close();
      }
      process.exit(0);
    });
  } catch (error) {
    agent.emit({ type: "info", message: `Error: ${error}` });
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
