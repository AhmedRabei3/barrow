const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const outDir = path.join(process.cwd(), "tmp", "header-audit");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const widths = [768, 900, 1024, 1280, 1440, 1920];
  const results = [];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3000", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: path.join(outDir, `header-${width}.png`),
      fullPage: false,
    });

    const result = await page.evaluate(() => {
      const header = document.querySelector(
        "div.fixed.top-0.left-0.right-0.z-50",
      );
      const desktopGrid = header?.querySelector("div.hidden.lg\\:grid");
      const compactRow = header?.querySelector("div.lg\\:hidden.grid");
      const searchWrap = header?.querySelector(
        "div.hidden.md\\:flex.px-2",
      );
      const compactSelect = header?.querySelector("select[name='mainCategory']");
      const desktopTabs = header?.querySelector("div.hidden.md\\:block button");

      const searchInput = searchWrap?.querySelector("input[type='text']");
      const searchCard = searchInput?.parentElement || null;
      const categorySlider = document.querySelector(
        "div.relative.overflow-hidden.mt-24",
      );

      const isVisible = (el) => {
        if (!el) return false;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && rect.width > 0 && rect.height > 0;
      };

      const searchRect = searchCard?.getBoundingClientRect();
      const categoryRect = categorySlider?.getBoundingClientRect();

      return {
        desktopGridVisible: isVisible(desktopGrid),
        compactRowVisible: isVisible(compactRow),
        searchVisible: isVisible(searchWrap),
        compactSelectVisible: isVisible(compactSelect),
        desktopTabsVisible: isVisible(desktopTabs),
        bodyWidth: document.body.clientWidth,
        searchWidth: searchRect ? Math.round(searchRect.width) : 0,
        searchHeight: searchRect ? Math.round(searchRect.height) : 0,
        searchBottomGapToCategories:
          searchRect && categoryRect
            ? Math.round(categoryRect.top - searchRect.bottom)
            : null,
      };
    });

    results.push({ width, ...result });
  }

  await browser.close();

  console.log(`SCREENSHOTS_DIR=${outDir}`);
  console.log(JSON.stringify(results, null, 2));
})();
