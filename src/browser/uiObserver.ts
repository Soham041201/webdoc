/**
 * Observes UI interactions and captures screenshots
 */

import type { Page } from "playwright";
import type { Agent } from "../agent/Agent.js";

export class UIObserver {
  private agent: Agent;
  private page: Page;
  private clickListeners: (() => void)[] = [];

  constructor(agent: Agent, page: Page) {
    this.agent = agent;
    this.page = page;
  }

  async start(): Promise<void> {
    // Inject click listener to track UI interactions
    await this.page.evaluate(() => {
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

    // Monitor clicks via page evaluation
    this.page.on("click", async () => {
      const clickInfo = await this.page!.evaluate(() => {
        return (window as any).__lastClick || null;
      });

      if (clickInfo) {
        const label =
          clickInfo.text ||
          clickInfo.ariaLabel ||
          clickInfo.title ||
          `${clickInfo.tagName} element` ||
          "Unknown element";
        this.agent.emit({ type: "ui_action", label, action: "click" });
      }
    });
  }


  async captureScreenshot(): Promise<Buffer> {
    return await this.page.screenshot({ fullPage: true });
  }

  async stop(): Promise<void> {
    // Cleanup handled by page lifecycle
  }
}
