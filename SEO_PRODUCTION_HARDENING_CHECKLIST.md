# SEO Production Hardening Checklist (Rent Anything)

## How to use this checklist

- **Status**:
  - ✅ Done = implemented and validated
  - 🟡 Partial = implemented but needs production refinement/monitoring
  - ❌ Todo = not yet implemented
- **Priority**:
  - P0 = do now
  - P1 = do this sprint
  - P2 = optimize later

---

## 20-Point Hardening Checklist

### A) Crawlability, Indexing, and Site Signals

1. **Canonical tags on key pages**  
   Status: ✅  
   Priority: P0  
   Notes: Home and item pages expose canonical.

2. **Robots rules aligned with private routes**  
   Status: ✅  
   Priority: P0  
   Notes: `robots.txt` present and references sitemap.

3. **Sitemap index + shards for scale**  
   Status: ✅  
   Priority: P0  
   Notes: `/sitemap.xml` + shard route working.

4. **Noindex on sensitive/private pages**  
   Status: ✅  
   Priority: P0  
   Notes: Private areas already set to noindex.

5. **Stable URL strategy (no duplicate paths)**  
   Status: 🟡  
   Priority: P1  
   Action: add redirects/canonical enforcement for any alternate/legacy URL variants.

### B) Metadata and SERP CTR Optimization

6. **Dynamic title/description templates**  
   Status: ✅  
   Priority: P0  
   Notes: metadata is centralized and dynamic.

7. **Per-page OpenGraph/Twitter images**  
   Status: ✅  
   Priority: P0  
   Notes: dynamic OG/Twitter on listing detail routes.

8. **Title/description length guardrails**  
   Status: ❌  
   Priority: P1  
   Action: add utility validation (title 50–60 chars, description 140–160 chars) in metadata helpers.

9. **Locale-aware metadata**  
   Status: ✅  
   Priority: P1  
   Notes: home metadata adapts by request language.

10. **Brand consistency across all snippets**  
    Status: 🟡  
    Priority: P1  
    Action: enforce one suffix/prefix pattern for all titles and OG alt text via shared helper.

### C) Structured Data (Schema.org)

11. **Organization + WebSite schema**  
    Status: ✅  
    Priority: P0

12. **WebPage/CollectionPage schema for home**  
    Status: ✅  
    Priority: P0

13. **Product schema on listing pages**  
    Status: ✅  
    Priority: P0

14. **BreadcrumbList schema where relevant**  
    Status: ✅  
    Priority: P0

15. **Schema validation in CI (Rich Results test workflow)**  
    Status: ❌  
    Priority: P1  
    Action: add CI job/script to test representative URLs against structured data expectations.

### D) Performance and Core Web Vitals

16. **Production CWV telemetry (LCP, INP, CLS)**  
    Status: ❌  
    Priority: P0  
    Action: wire `useReportWebVitals` and send to analytics endpoint.

17. **Image optimization policy (sizes, modern formats)**  
    Status: 🟡  
    Priority: P1  
    Action: audit listing images and ensure proper `next/image` usage with responsive `sizes`.

18. **Critical rendering path optimization**  
    Status: 🟡  
    Priority: P1  
    Action: verify largest above-the-fold components, reduce blocking JS, lazy-load non-critical widgets.

### E) Governance, Monitoring, and Growth

19. **Search Console + Bing Webmaster coverage workflow**  
    Status: ❌  
    Priority: P0  
    Action: submit sitemap index, monitor coverage, inspect item URLs weekly.

20. **SEO regression checks before release**  
    Status: ❌  
    Priority: P0  
    Action: add pre-release smoke (canonical, robots, sitemap, OG/Twitter, JSON-LD on sample pages).

---

## Immediate execution plan (highest impact)

### Week 1 (P0)

- Implement Web Vitals telemetry pipeline (LCP/INP/CLS).
- Configure Search Console/Bing and submit `/sitemap.xml`.
- Add SEO regression smoke script and run on each release.

### Week 2 (P1)

- Add metadata length guardrails in shared SEO helpers.
- Normalize title/brand pattern across all pages.
- Add CI checks for structured data on Home + Item detail sample URLs.

### Week 3 (P1/P2)

- Audit image sizing and above-the-fold performance.
- Review URL duplication/redirect strategy.

---

## Acceptance criteria for “SEO hardened”

- Core SEO routes return stable `200` in production.
- Search Console shows healthy indexing trend with low excluded errors.
- Web Vitals meet targets on real-user data over 28 days.
- SEO regression suite passes before every deployment.
- Rich Results validation passes on representative URLs.
