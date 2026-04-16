import { chromium } from "@playwright/test";

const OUTPUT_DIR = "/tmp/hilmy-audit";
const URL = "https://hilmy.io";

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-375", width: 375, height: 812 },
] as const;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // Clear cookies to ensure "non connecté" state
  await context.clearCookies();

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });

  // --- Extract text content ---
  const title = await page.title();

  const metaDescription = await page
    .locator('meta[name="description"]')
    .getAttribute("content")
    .catch(() => "(aucune)");

  const headings = await page.evaluate(() => {
    const els = document.querySelectorAll("h1, h2, h3");
    return Array.from(els).map((el) => ({
      tag: el.tagName,
      text: (el as HTMLElement).innerText.trim(),
    }));
  });

  const ctas = await page.evaluate(() => {
    const results: { tag: string; text: string; href: string }[] = [];
    // Buttons
    document.querySelectorAll("button").forEach((el) => {
      const text = el.innerText.trim();
      if (text) results.push({ tag: "button", text, href: "" });
    });
    // Links that look like CTAs (rounded-full or prominent styling)
    document.querySelectorAll("a").forEach((el) => {
      const text = el.innerText.trim();
      const href = el.getAttribute("href") ?? "";
      const cls = el.className ?? "";
      const isNav = el.closest("nav") !== null;
      // Include all links with text (skip empty icon links)
      if (text && text.length > 1) {
        results.push({ tag: isNav ? "nav-link" : "a", text, href });
      }
    });
    return results;
  });

  // --- Console output ---
  console.log("\n========== AUDIT LANDING hilmy.io ==========\n");
  console.log(`Title: ${title}`);
  console.log(`Meta description: ${metaDescription}`);

  console.log("\n--- Headings (H1/H2/H3) ---");
  for (const h of headings) {
    console.log(`  ${h.tag}: ${h.text}`);
  }

  console.log("\n--- CTAs & Links ---");
  for (const c of ctas) {
    const hrefPart = c.href ? ` → ${c.href}` : "";
    console.log(`  [${c.tag}] ${c.text}${hrefPart}`);
  }

  // --- Screenshots ---
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    // Wait for any layout shift after resize
    await page.waitForTimeout(500);
    const path = `${OUTPUT_DIR}/${vp.name}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`\nScreenshot saved: ${path}`);
  }

  await browser.close();
  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
