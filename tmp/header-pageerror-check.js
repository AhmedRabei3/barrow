const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });

  const logs = [];
  page.on("console", (msg) => {
    logs.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    logs.push({ type: "pageerror", text: err.message, stack: err.stack });
  });
  page.on("requestfailed", (req) => {
    logs.push({
      type: "requestfailed",
      text: `${req.url()} | ${req.failure()?.errorText}`,
    });
  });

  await page.goto("http://localhost:3000", {
    waitUntil: "load",
    timeout: 60000,
  });

  await page.waitForTimeout(6000);

  const bodyText = await page.evaluate(() =>
    document.body.innerText.slice(0, 500),
  );

  console.log("BODY_TEXT=" + bodyText.replace(/\s+/g, " "));
  console.log(JSON.stringify(logs, null, 2));

  await browser.close();
})();
