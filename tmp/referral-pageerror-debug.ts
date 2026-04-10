import { chromium } from "playwright";

const referralId = process.argv[2] ?? "ctestreferraldebug1234567890";
const url = `http://localhost:3000/?ref=${referralId}`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (message) => {
    console.log(`[console:${message.type()}] ${message.text()}`);
  });

  page.on("pageerror", (error) => {
    console.log(`[pageerror] ${error.name}: ${error.message}`);
    if (error.stack) {
      console.log(error.stack);
    }
  });

  page.on("response", async (response) => {
    if (response.status() >= 400) {
      console.log(`[response:${response.status()}] ${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  console.log(`[url] ${page.url()}`);
  console.log(`[title] ${await page.title()}`);
  const bodyText = await page.locator("body").innerText();
  console.log(`[body-snippet] ${bodyText.slice(0, 500)}`);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
