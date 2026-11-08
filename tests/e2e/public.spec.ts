import { expect, test } from "@playwright/test";

test.describe("site public", () => {
  test("page d'accueil : hero, recherche et navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/JOBLINK/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Trouvez du travail");
    await expect(page.getByRole("search")).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link", { name: "Trouver une mission" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Publier une mission" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Devenir travailleur" }).first()).toBeVisible();
  });

  test("la barre de recherche mène à /jobs avec les filtres", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Plombier, ménage, site web…").fill("plombier");
    await page.getByPlaceholder("Ville ou quartier").fill("Cotonou");
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(page).toHaveURL(/\/jobs\?q=plombier&city=Cotonou/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  for (const [path, heading] of [
    ["/jobs", /missions/i],
    ["/categories", /Catégories/],
    ["/about", /À propos/],
    ["/how-it-works", /Comment ça marche/],
    ["/faq", /Questions fréquentes/],
    ["/contact", /Contactez-nous/],
    ["/terms", /Conditions générales/],
    ["/privacy", /confidentialité/],
    ["/map", /Carte des missions/],
  ] as const) {
    test(`page ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    });
  }

  test("page inexistante : 404 en français", async ({ page }) => {
    const res = await page.goto("/cette-page-nexiste-pas");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Page introuvable")).toBeVisible();
  });

  test("en-têtes de sécurité", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("SEO : robots.txt exclut les espaces privés, sitemap disponible", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/client/", "/worker/", "/admin/", "/messages"]) expect(robots).toContain(`Disallow: ${p}`);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/how-it-works");
  });

  test("menu mobile @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const mobileNav = page.getByRole("navigation", { name: "Navigation mobile" });
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole("link", { name: "Comment ça marche" }).click();
    await expect(page).toHaveURL(/how-it-works/);
  });
});
