import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Petit clip de test (mire ffmpeg) servi à la place des vidéos Pexels.
const clip = readFileSync(path.join(__dirname, "../fixtures/hero-clip.mp4"));
const media = (page: import("@playwright/test").Page) => page.locator("[data-hero-media]");

test.describe("Hero : vidéo puis photo", () => {
  test("joue la vidéo, affiche le crédit Pexels, puis revient à la photo après ~20 s", async ({ page }) => {
    test.setTimeout(60_000);
    await page.route("https://videos.pexels.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "video/mp4", body: clip }),
    );
    await page.goto("/");
    await expect(media(page)).toHaveAttribute("data-hero-media", "video", { timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Vidéo : .* \/ Pexels/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Passer la vidéo" })).toBeVisible();
    const started = Date.now();
    await expect(media(page)).toHaveAttribute("data-hero-media", "photo", { timeout: 35_000 });
    const elapsed = (Date.now() - started) / 1000;
    expect(elapsed).toBeGreaterThan(14);
    await expect(page.getByRole("link", { name: /Photo : .* \/ Unsplash/ })).toBeVisible();
    // Les vidéos sont libérées une fois la photo affichée.
    await expect(page.locator("[data-hero-media] video")).toHaveCount(0, { timeout: 5_000 });
  });

  test("le bouton « Passer la vidéo » affiche la photo", async ({ page }) => {
    await page.route("https://videos.pexels.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "video/mp4", body: clip }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Passer la vidéo" }).click({ timeout: 10_000 });
    await expect(media(page)).toHaveAttribute("data-hero-media", "photo");
  });

  test("vidéo indisponible : la photo s'affiche directement", async ({ page }) => {
    await page.route("https://videos.pexels.com/**", (route) => route.abort());
    await page.goto("/");
    await expect(media(page)).toHaveAttribute("data-hero-media", "photo", { timeout: 8_000 });
  });

  test("animations réduites : pas de vidéo", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    let requested = false;
    await page.route("https://videos.pexels.com/**", (route) => {
      requested = true;
      return route.abort();
    });
    await page.goto("/");
    await expect(media(page)).toHaveAttribute("data-hero-media", "photo");
    expect(requested).toBe(false);
    await ctx.close();
  });
});
