const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const widths = [900, 1024, 1100, 1280];
  const results = [];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3000", {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForTimeout(1200);

    const item = await page.evaluate(() => {
      const header = document.querySelector(
        "div.fixed.top-0.left-0.right-0.z-50",
      );
      if (!header) return { hasHeader: false };

      const isVisible = (el) => {
        if (!el) return false;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && r.width > 0 && r.height > 0;
      };

      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          r: r.right,
          b: r.bottom,
        };
      };

      const desktopGrid = header.querySelector("div.hidden.lg\\:grid");
      const compactRow = header.querySelector(
        "div.lg\\:hidden.flex.items-center.justify-between",
      );

      const desktopVisible = isVisible(desktopGrid);
      const compactVisible = isVisible(compactRow);

      if (desktopVisible) {
        const left = desktopGrid.children[0];
        const center = desktopGrid.children[1];
        const right = desktopGrid.children[2];

        const rightChildren = [...right.children].map((child) => {
          const r = child.getBoundingClientRect();
          return {
            tag: child.tagName,
            className: String(child.className || "").slice(0, 80),
            w: r.width,
            h: r.height,
          };
        });

        return {
          hasHeader: true,
          mode: "desktop",
          hasOverflow: desktopGrid.scrollWidth > desktopGrid.clientWidth + 2,
          rightOverflow: right.scrollWidth > right.clientWidth + 2,
          header: rect(header),
          grid: rect(desktopGrid),
          left: rect(left),
          center: rect(center),
          right: rect(right),
          rightChildren,
        };
      }

      if (compactVisible) {
        const left = compactRow.children[0];
        const right = compactRow.children[1];
        return {
          hasHeader: true,
          mode: "compact",
          row: rect(compactRow),
          left: rect(left),
          right: rect(right),
          rightOverflow: right.scrollWidth > right.clientWidth + 2,
          rowOverflow: compactRow.scrollWidth > compactRow.clientWidth + 2,
        };
      }

      return { hasHeader: true, mode: "unknown" };
    });

    results.push({ width, ...item });
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
