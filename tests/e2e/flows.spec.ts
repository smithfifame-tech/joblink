import { expect, test, type Page } from "@playwright/test";

/**
 * Parcours complets contre une instance Supabase réelle (locale ou staging) avec le seed de démonstration.
 * Activés avec E2E_SUPABASE=1 (voir docs/TESTING.md). Mot de passe des comptes de démo : Demo!Joblink2026
 */
test.skip(!process.env.E2E_SUPABASE, "Nécessite une instance Supabase avec le seed (E2E_SUPABASE=1)");

const PASSWORD = "Demo!Joblink2026";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail ou téléphone").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test("inscription client puis écran de confirmation d'e-mail", async ({ page }) => {
  const email = `e2e-client-${Date.now()}@demo.joblink.test`;
  await page.goto("/register?type=client");
  await page.getByLabel("Nom", { exact: true }).fill("Testeur");
  await page.getByLabel("Prénom").fill("Client");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Numéro de téléphone").fill("01 97 00 00 11");
  await page.getByLabel("Ville").fill("Cotonou");
  await page.getByLabel("Quartier").fill("Akpakpa");
  await page.locator("#password").fill("Robuste#Motdepasse2026");
  await page.locator("#confirmPassword").fill("Robuste#Motdepasse2026");
  await page.getByLabel(/J'accepte les/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/check-email/);
});

test("inscription travailleur", async ({ page }) => {
  await page.goto("/register?type=worker");
  await expect(page.getByRole("radio", { name: /Travailleur/ })).toBeChecked();
});

test("connexion par rôle, déconnexion", async ({ page }) => {
  await login(page, "client1@demo.joblink.test");
  await expect(page).toHaveURL(/\/client\/dashboard/);
  await page.getByRole("button", { name: "Déconnexion" }).first().click();
  await expect(page).toHaveURL(/login\?logged_out=1/);
  await login(page, "worker1@demo.joblink.test");
  await expect(page).toHaveURL(/\/worker\/dashboard/);
});

test("un travailleur ne peut pas accéder à l'administration", async ({ page }) => {
  await login(page, "worker1@demo.joblink.test");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/worker\/dashboard/);
});

test("l'administrateur accède à la vue générale", async ({ page }) => {
  await login(page, "admin@demo.joblink.test");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Revenus de commissions")).toBeVisible();
});

test("candidature d'un travailleur à une mission de démonstration", async ({ page }) => {
  await login(page, "worker1@demo.joblink.test");
  await page.goto("/jobs?q=nettoyage");
  await page.getByRole("link", { name: /Nettoyage complet/ }).first().click();
  const already = page.getByText("Votre candidature");
  if (!(await already.isVisible())) {
    await page.getByLabel("Votre message au client").fill("Disponible dès demain, j'apporte mon matériel professionnel.");
    await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
  }
  await expect(page.getByText("Votre candidature")).toBeVisible();
});
