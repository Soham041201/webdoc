
import puppeteer, { Browser, Page, HTTPResponse, Target } from "puppeteer";
import { Agent } from "../agent/Agent.js";
import { NetworkRecorder } from "./networkRecorder.js";
import { UIObserver } from "./uiObserver.js";

export class BrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private networkRecorder: NetworkRecorder | null = null;
  private uiObserver: UIObserver | null = null;
  private agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async launch(): Promise<void> {
    console.log("[DEBUG] PuppeteerController.launch starting...");
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== "false",
      slowMo: process.env.HEADLESS === "false" ? 100 : 0,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    console.log("[DEBUG] puppeteer.launch returned.");

    console.log("[DEBUG] Getting browser pages...");
    const pages = await this.browser.pages();
    console.log(`[DEBUG] Found ${pages.length} pages.`);
    this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    console.log("[DEBUG] Page initialized.");

    // Set up network recording
    console.log("[DEBUG] Setting up NetworkRecorder...");
    this.networkRecorder = new NetworkRecorder(this.agent, this.page);
    await this.networkRecorder.start();
    console.log("[DEBUG] NetworkRecorder started.");

    // Set up UI observation
    console.log("[DEBUG] Setting up UIObserver...");
    this.uiObserver = new UIObserver(this.agent, this.page);
    await this.uiObserver.start();
    console.log("[DEBUG] UIObserver started.");
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not launched");
    }

    const response = await this.page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    try {
      await this.page.waitForNetworkIdle({ timeout: 5000 });
    } catch {
      // Ignore network idle timeout
    }

    const finalUrl = this.page.url();
    const title = await this.page.title().catch(() => "");
    const bodyText = await this.page.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => "");

    if (looksLikeChallengePage(finalUrl, title, bodyText)) {
      this.agent.emit({
        type: "info",
        message: "Detected a verification/interstitial page. Please complete it manually if in non-headless mode.",
      });
    }

    if (response && !response.ok() && response.status() >= 400) {
      this.agent.emit({
        type: "info",
        message: `Initial navigation returned HTTP ${response.status()} for ${finalUrl}.`,
      });
    }
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
    try {
      const screenshot = await this.page.screenshot({ fullPage: true });
      return Buffer.from(screenshot);
    } catch (e) {
      // Fallback to viewport screenshot if page is too large
      const screenshot = await this.page.screenshot({ fullPage: false });
      return Buffer.from(screenshot);
    }
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
    
    // Puppeteer implementation of finding and clicking elements
    const message = await this.page.evaluate(async (actionText) => {
        const normalized = actionText.toLowerCase();
        
        const isMatch = (elText: string) => {
            if (!elText) return false;
            const t = elText.toLowerCase();
            return t.includes(normalized) || normalized.includes(t);
        };

        // Try to find a button or link
        const elements = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'));
        for (const el of elements) {
            const text = (el as HTMLElement).innerText || (el as HTMLInputElement).value || el.getAttribute('aria-label') || '';
            if (isMatch(text)) {
                (el as HTMLElement).click();
                return `Clicked ${el.tagName.toLowerCase()}: ${text}`;
            }
        }
        
        return null;
    }, action);

    if (message) {
        await this.waitForIdle();
        return { ok: true, message };
    }

    return { ok: false, message: "No matching UI element found" };
  }

  async performPlannedAction(plan: any): Promise<{ ok: boolean; message: string }> {
    if (!this.page) return { ok: false, message: "Browser not launched" };

    if (plan.type === "navigate" && plan.url) {
      await this.navigate(plan.url);
      return { ok: true, message: `Navigated to ${plan.url}` };
    }
    
    if (plan.type === "click" && plan.action) {
        return await this.performSuggestedAction(plan.action);
    }

    return { ok: false, message: "Action type not yet implemented in Puppeteer bridge" };
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

  startCapture(baseUrl: string, includeThirdParty = false): void {
    if (!this.networkRecorder) return;
    this.networkRecorder.startCapture({ baseUrl, includeThirdParty });
  }

  stopCapture(): void {
    this.networkRecorder?.stopCapture();
  }

  getCapturedCalls(): any[] {
    return this.networkRecorder?.getCapturedCalls() || [];
  }

  setCaptureListener(listener?: (call: any) => void): void {
    this.networkRecorder?.setCaptureListener(listener);
  }

  async goBackOrNavigate(fallbackUrl: string): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
    } catch {
      await this.navigateSoft(fallbackUrl);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async waitForIdle(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.waitForNetworkIdle({ timeout: 5000 });
    } catch {
      // Ignore
    }
  }
}

function looksLikeChallengePage(url: string, title: string, bodyText: string): boolean {
  const combined = `${url}\n${title}\n${bodyText}`.toLowerCase();
  return (
    combined.includes("cloudflare") ||
    combined.includes("verify you are human") ||
    combined.includes("security check") ||
    combined.includes("attention required") ||
    combined.includes("captcha") ||
    combined.includes("checking your browser")
  );
}
