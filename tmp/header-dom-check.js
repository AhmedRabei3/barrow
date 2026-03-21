const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });

  await page.goto("http://localhost:3000", {
    waitUntil: "load",
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  const info = await page.evaluate(() => {
    const logo = document.querySelector("img[alt='logo']");
    const fixedElements = [...document.querySelectorAll("*")]
      .filter((el) => getComputedStyle(el).position === "fixed")
      .map((el) => ({
        tag: el.tagName,
        className: String(el.className || "").slice(0, 200),
      }))
      .slice(0, 20);

    const buttons = [...document.querySelectorAll("button")]
      .map((btn) => (btn.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 30);

    return {
      title: document.title,
      bodyTextSample: document.body.innerText.slice(0, 500),
      logoFound: Boolean(logo),
      fixedElements,
      buttons,
      bodyHtmlSample: document.body.innerHTML.slice(0, 500),
    };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
