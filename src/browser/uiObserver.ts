
/**
 * Observes UI interactions and captures screenshots using Puppeteer
 */

import type { Page } from "puppeteer";

export class UIObserver {
  private agent: any;
  private page: Page;

  constructor(agent: any, page: Page) {
    this.agent = agent;
    this.page = page;
  }

  async start(): Promise<void> {
    // Inject click listener to track UI interactions
    await this.page.evaluateOnNewDocument(() => {
      document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target) {
          // Store click info for retrieval
          (window as any).__lastClick = {
            text: target.textContent?.trim() || "",
            ariaLabel: target.getAttribute("aria-label") || "",
            title: target.getAttribute("title") || "",
            tagName: target.tagName,
          };
        }
      }, true);
    });
  }

  async captureScreenshot(): Promise<Buffer> {
    const screenshot = await this.page.screenshot({ fullPage: true });
    return Buffer.from(screenshot);
  }

  async stop(): Promise<void> {
    // Cleanup handled by page lifecycle
  }
}
