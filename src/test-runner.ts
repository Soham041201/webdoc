
import { execSync } from "child_process";
import { resolve } from "path";

const sites = [
  { url: "https://jsonplaceholder.typicode.com/", name: "jsonplaceholder" },
  { url: "https://httpbin.org/", name: "httpbin" },
  { url: "https://example.com", name: "example" }
];

async function runTests() {
  process.env.HEADLESS = "false";
  process.env.AUTO_EXPLORE = "true";

  for (const site of sites) {
    console.log(`\n\n=== TESTING SITE: ${site.name} (${site.url}) ===`);
    try {
      // Run the actual CLI tool as a separate process
      execSync(`AUTO_EXPLORE=true HEADLESS=false bun run src/index.tsx open ${site.url} --docs-path ./test-docs/${site.name}`, {
        stdio: "inherit",
        env: {
          ...process.env,
          AUTO_EXPLORE: "true",
          HEADLESS: "false"
        }
      });
      console.log(`=== FINISHED TESTING SITE: ${site.name} ===`);
    } catch (error) {
      console.error(`=== FAILED TESTING SITE: ${site.name} ===`, error);
    }
  }
}

runTests();
