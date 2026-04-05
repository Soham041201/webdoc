
import { Agent } from "./agent/Agent.js";
import { runAgent } from "./index.js";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

async function testWebsite(url: string, testName: string) {
  console.log(`\n\n=== STARTING TEST: ${testName} (${url}) ===`);
  const agent = new Agent();
  const docsPath = resolve(process.cwd(), "test-docs", testName);
  
  // Set mode to EXECUTE so it tries to do things
  agent.setMode("EXECUTE");

  // Auto-approve everything for the test
  agent.onEvent(async (event) => {
    if (event.type === "approval_required") {
      console.log(`[Auto-Approving] ${event.action} (Risk: ${event.risk})`);
      // Use setTimeout to avoid potential recursive call issues if it was synchronous
      setTimeout(() => agent.resolveApproval("yes"), 0);
    } else if (event.type === "action_suggestion") {
      console.log(`[Auto-Approving Action] ${event.action}`);
      setTimeout(() => agent.resolveActionDecision("yes"), 0);
    } else if (event.type === "next_steps") {
       console.log(`[Auto-Approving Next Steps] ${event.question}`);
       setTimeout(() => agent.resolveNextSteps("yes"), 0);
    } else if (event.type === "info") {
      console.log(`[info] ${event.message}`);
    } else if (event.type === "llm_status") {
      if (event.status === "thinking") {
        console.log(`[llm] Thinking: ${event.message}`);
      }
    }
  });

  try {
    await runAgent(agent, url, docsPath);
    console.log(`=== TEST COMPLETED: ${testName} ===`);
  } catch (error) {
    console.error(`=== TEST FAILED: ${testName} ===`, error);
  }
}

async function runAllTests() {
  process.env.HEADLESS = "false";
  
  const sites = [
    { url: "https://jsonplaceholder.typicode.com/", name: "jsonplaceholder" },
    { url: "https://httpbin.org/", name: "httpbin" },
    { url: "https://example.com", name: "example" }
  ];

  for (const site of sites) {
    await testWebsite(site.url, site.name);
  }
  
  console.log("\n\nAll tests finished!");
  process.exit(0);
}

runAllTests().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
