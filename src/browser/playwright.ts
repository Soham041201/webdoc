/**
 * Playwright browser integration
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import type { Agent } from "../agent/Agent.js";
import { NetworkRecorder, type CapturedCall } from "./networkRecorder.js";
import { UIObserver } from "./uiObserver.js";

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private networkRecorder: NetworkRecorder | null = null;
  private uiObserver: UIObserver | null = null;
  private agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async launch(): Promise<void> {
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100, // Slow down for observability
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();

    // Set up network recording
    this.networkRecorder = new NetworkRecorder(this.agent, this.page);
    await this.networkRecorder.start();

    // Set up UI observation
    this.uiObserver = new UIObserver(this.agent, this.page);
    await this.uiObserver.start();
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not launched");
    }
    await this.page.goto(url, { waitUntil: "networkidle" });
  }

  async navigateSoft(url: string): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not launched");
    }
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  }

  async takeScreenshot(): Promise<Buffer> {
    if (!this.page) {
      throw new Error("Browser not launched");
    }
    return await this.page.screenshot({ fullPage: true });
  }

  async getPageContext(): Promise<{
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
  }> {
    if (!this.page) {
      throw new Error("Browser not launched");
    }

    const title = await this.page.title();
    const context = await this.page.evaluate(() => {
      const clean = (text?: string | null) =>
        (text || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120);

      const takeUnique = (items: string[], max: number) => {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const item of items) {
          if (!item || seen.has(item)) continue;
          seen.add(item);
          result.push(item);
          if (result.length >= max) break;
        }
        return result;
      };

      const headings = Array.from(document.querySelectorAll("h1,h2"))
        .map((el) => clean(el.textContent))
        .filter(Boolean);

      const buttons = Array.from(document.querySelectorAll("button,[role='button'],input[type='submit']"))
        .map((el) => clean((el as HTMLElement).textContent || (el as HTMLInputElement).value))
        .filter(Boolean);

      const links = Array.from(document.querySelectorAll("a"))
        .map((el) => clean((el as HTMLAnchorElement).textContent))
        .filter(Boolean);

      return {
        headings: takeUnique(headings, 6),
        buttons: takeUnique(buttons, 6),
        links: takeUnique(links, 6),
      };
    });

    return {
      title,
      headings: context.headings,
      buttons: context.buttons,
      links: context.links,
    };
  }

  async performSuggestedAction(action: string): Promise<{ ok: boolean; message: string }> {
    if (!this.page) {
      return { ok: false, message: "Browser not launched" };
    }

    const normalized = action.toLowerCase();
    const candidates = this.buildActionCandidates(normalized);

    if (/(first\s+video|first\s+result|first\s+item|first\s+image|first\s+thumbnail|play\s+first)/i.test(normalized)) {
      const clicked = await this.tryClickFirstResult();
      if (clicked) {
        await this.waitForIdle();
        return { ok: true, message: "Clicked the first result" };
      }
    }

    // Try buttons first
    for (const candidate of candidates.buttonNames) {
      const clicked = await this.tryClickByRole("button", candidate);
      if (clicked) {
        await this.waitForIdle();
        return { ok: true, message: `Clicked button: ${candidate}` };
      }
    }

    // Try links
    for (const candidate of candidates.linkNames) {
      const clicked = await this.tryClickByRole("link", candidate);
      if (clicked) {
        await this.waitForIdle();
        return { ok: true, message: `Clicked link: ${candidate}` };
      }
    }

    // Fallback: try text matches
    for (const candidate of candidates.texts) {
      const clicked = await this.tryClickByText(candidate);
      if (clicked) {
        await this.waitForIdle();
        return { ok: true, message: `Clicked element with text: ${candidate}` };
      }
    }

    return { ok: false, message: "No matching UI element found for the suggested action" };
  }

  async performPlannedAction(plan: {
    type: "click" | "type" | "press" | "navigate" | "";
    action?: string;
    target?: string;
    value?: string;
    key?: string;
    url?: string;
    submit?: boolean;
  }): Promise<{ ok: boolean; message: string }> {
    if (!this.page) {
      return { ok: false, message: "Browser not launched" };
    }

    if (plan.type === "navigate" && plan.url) {
      try {
        const targetUrl = this.normalizeUrl(plan.url);
        await this.navigate(targetUrl);
        return { ok: true, message: `Navigated to ${targetUrl}` };
      } catch {
        return { ok: false, message: "Failed to navigate to the requested URL" };
      }
    }

    if (plan.type === "click" && plan.action) {
      return await this.performSuggestedAction(plan.action);
    }

    if (plan.type === "press" && plan.key) {
      try {
        await this.page.keyboard.press(plan.key);
        return { ok: true, message: `Pressed ${plan.key}` };
      } catch {
        return { ok: false, message: `Failed to press ${plan.key}` };
      }
    }

    if (plan.type === "type" && plan.value) {
      const filled = await this.tryFillInput(plan.target, plan.value);
      if (!filled) {
        return { ok: false, message: "No suitable input found to type into" };
      }
      if (plan.submit) {
        try {
          await this.page.keyboard.press("Enter");
          return { ok: true, message: `Typed "${plan.value}" and pressed Enter` };
        } catch {
          return { ok: true, message: `Typed "${plan.value}"` };
        }
      }
      return { ok: true, message: `Typed "${plan.value}"` };
    }

    return { ok: false, message: "No actionable plan was provided" };
  }

  getPage(): Page | null {
    return this.page;
  }

  async getNavigationCandidates(): Promise<{ label: string; href?: string; type: "link" | "button" }[]> {
    if (!this.page) return [];
    return await this.page.evaluate(() => {
      const isVisible = (el: Element) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      };

      const clean = (text?: string | null) =>
        (text || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80);

      const candidates: { label: string; href?: string; type: "link" | "button" }[] = [];

      const links = Array.from(document.querySelectorAll("a"));
      for (const link of links) {
        if (!isVisible(link)) continue;
        const label = clean(link.textContent) || clean(link.getAttribute("aria-label"));
        if (!label) continue;
        const href = (link as HTMLAnchorElement).href;
        candidates.push({ label, href, type: "link" });
      }

      const buttons = Array.from(
        document.querySelectorAll("button,[role='button'],input[type='button'],input[type='submit']")
      );
      for (const button of buttons) {
        if (!isVisible(button)) continue;
        const label =
          clean(button.textContent) ||
          clean((button as HTMLInputElement).value) ||
          clean(button.getAttribute("aria-label"));
        if (!label) continue;
        candidates.push({ label, type: "button" });
      }

      const seen = new Set<string>();
      const unique = [];
      for (const item of candidates) {
        const key = `${item.type}:${item.label}:${item.href || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
        if (unique.length >= 25) break;
      }

      return unique;
    });
  }

  async goBackOrNavigate(fallbackUrl: string): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
    } catch {
      await this.navigateSoft(fallbackUrl);
    }
  }

  startCapture(baseUrl: string, includeThirdParty = false): void {
    if (!this.networkRecorder) return;
    this.networkRecorder.startCapture({ baseUrl, includeThirdParty });
  }

  stopCapture(): void {
    this.networkRecorder?.stopCapture();
  }

  getCapturedCalls(): CapturedCall[] {
    return this.networkRecorder?.getCapturedCalls() || [];
  }

  setCaptureListener(listener?: (call: CapturedCall) => void): void {
    this.networkRecorder?.setCaptureListener(listener);
  }

  async close(): Promise<void> {
    if (this.networkRecorder) {
      await this.networkRecorder.stop();
    }
    if (this.uiObserver) {
      await this.uiObserver.stop();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async tryClickByRole(role: "button" | "link", name: string | RegExp): Promise<boolean> {
    if (!this.page) return false;
    try {
      const locator = this.page.getByRole(role, { name });
      const count = await locator.count();
      for (let i = 0; i < count; i += 1) {
        const item = locator.nth(i);
        if (await item.isVisible()) {
          await item.click({ timeout: 5000 });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async tryClickByText(text: string | RegExp): Promise<boolean> {
    if (!this.page) return false;
    try {
      const locator = this.page.getByText(text, { exact: false });
      const count = await locator.count();
      for (let i = 0; i < count; i += 1) {
        const item = locator.nth(i);
        if (await item.isVisible()) {
          await item.click({ timeout: 5000 });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async tryFillInput(target: string | undefined, value: string): Promise<boolean> {
    if (!this.page) return false;
    const locators = [];

    if (target) {
      const safeTarget = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeTarget, "i");
      locators.push(this.page.getByRole("textbox", { name: regex }));
      locators.push(this.page.getByRole("searchbox", { name: regex }));
      locators.push(this.page.getByPlaceholder(regex));
      locators.push(this.page.getByLabel(regex));
      locators.push(this.page.locator(`input[name*="${safeTarget}" i], input[id*="${safeTarget}" i]`));
    }

    locators.push(this.page.getByRole("searchbox"));
    locators.push(this.page.locator('input[type="search"]'));
    locators.push(this.page.locator('input[placeholder*="Search" i]'));
    locators.push(this.page.locator('input[aria-label*="Search" i]'));
    locators.push(this.page.locator('input[type="text"]'));
    locators.push(this.page.locator('textarea'));

    for (const locator of locators) {
      try {
        const count = await locator.count();
        for (let i = 0; i < count; i += 1) {
          const item = locator.nth(i);
          if (await item.isVisible()) {
            await item.fill(value, { timeout: 5000 });
            return true;
          }
        }
      } catch {
        // try next locator
      }
    }

    return false;
  }

  private async tryClickFirstResult(): Promise<boolean> {
    if (!this.page) return false;
    const selectors = [
      'ytd-video-renderer a#video-title',
      'ytd-rich-item-renderer a#video-title',
      'a#video-title',
      '[data-testid="video-title"]',
      'a[href*="watch"]',
    ];

    for (const selector of selectors) {
      try {
        const locator = this.page.locator(selector);
        const count = await locator.count();
        for (let i = 0; i < count; i += 1) {
          const item = locator.nth(i);
          if (await item.isVisible()) {
            await item.click({ timeout: 5000 });
            return true;
          }
        }
      } catch {
        // try next selector
      }
    }

    return false;
  }

  private buildActionCandidates(action: string): {
    buttonNames: (string | RegExp)[];
    linkNames: (string | RegExp)[];
    texts: (string | RegExp)[];
  } {
    const buttonNames: (string | RegExp)[] = [];
    const linkNames: (string | RegExp)[] = [];
    const texts: (string | RegExp)[] = [];

    if (action.includes("login") || action.includes("log in") || action.includes("sign in")) {
      const loginRegex = /log\s*in|login|sign\s*in/i;
      buttonNames.push(loginRegex);
      linkNames.push(loginRegex);
      texts.push(loginRegex);
    }

    if (action.includes("signup") || action.includes("sign up") || action.includes("register")) {
      const signupRegex = /sign\s*up|signup|register|create\s*account/i;
      buttonNames.push(signupRegex);
      linkNames.push(signupRegex);
      texts.push(signupRegex);
    }

    if (action.includes("checkout") || action.includes("cart") || action.includes("basket")) {
      const checkoutRegex = /checkout|cart|basket/i;
      buttonNames.push(checkoutRegex);
      linkNames.push(checkoutRegex);
      texts.push(checkoutRegex);
    }

    if (action.includes("continue") || action.includes("start")) {
      const continueRegex = /continue|start|get\s*started|next/i;
      buttonNames.push(continueRegex);
      linkNames.push(continueRegex);
      texts.push(continueRegex);
    }

    // If the action contains quoted text, try that directly
    const quoted = action.match(/"([^"]+)"|'([^']+)'/);
    if (quoted) {
      const text = quoted[1] || quoted[2];
      if (text) {
        texts.push(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      }
    }

    // Fallback to action text
    if (buttonNames.length === 0 && linkNames.length === 0 && texts.length === 0) {
      texts.push(new RegExp(action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }

    return { buttonNames, linkNames, texts };
  }

  private async waitForIdle(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 8000 });
    } catch {
      // Ignore timeouts; not all pages reach network idle
    }
  }

  private normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }
}
