
import puppeteer from "puppeteer";
console.log("Puppeteer imported:", !!puppeteer);
console.log("Puppeteer launch:", !!puppeteer.launch);

async function test() {
  try {
    console.log("Launching...");
    const browser = await puppeteer.launch({ headless: true });
    console.log("Launched!");
    const page = await browser.newPage();
    await page.goto("https://example.com");
    console.log("Title:", await page.title());
    await browser.close();
    console.log("Closed!");
  } catch (e) {
    console.error("Failed:", e);
  }
}

test();
