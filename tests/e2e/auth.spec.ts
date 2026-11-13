import { expect, test } from "@playwright/test";

test.describe("protection des routes", () => {
  for (const path of ["/client/dashboard", "/worker/dashboard", "/admin", "/admin/users", "/messages", "/notifications", "/client/jobs/new"]) {
    test(`${path} redirige vers la connexion sans session`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      await expect(page.getByRole("heading", { name: /Bon retour/ })).toBeVisible();
    });
  }
});

test.describe("formulaire d'inscription", () => {
  test("type travailleur présélectionné via ?type=worker", async ({ page }) => {
    await page.goto("/register?type=worker");
    await expect(page.getByRole("radio", { name: /Travailleur/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Client/ })).not.toBeChecked();
  });

  test("affiche les erreurs de validation des champs obligatoires", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("L'adresse e-mail est obligatoire")).toBeVisible();
    await expect(page.getByText("Vous devez accepter les conditions générales")).toBeVisible();
    await expect(page.getByText("Numéro de téléphone obligatoire")).toBeVisible();
  });

  test("contrôle e-mail, téléphone, robustesse et confirmation du mot de passe", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Adresse e-mail").fill("pas-un-email");
    await page.getByLabel("Numéro de téléphone").fill("123");
    await page.locator("#password").fill("faible");
    await expect(page.getByText(/Robustesse : (Très faible|Faible)/)).toBeVisible();
    await page.locator("#confirmPassword").fill("different");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Adresse e-mail invalide")).toBeVisible();
    await expect(page.getByText("Au moins 10 caractères")).toBeVisible();
    await expect(page.getByText(/Numéro invalide/)).toBeVisible();
    await page.locator("#password").fill("Robuste#Motdepasse2026");
    await expect(page.getByText("Robustesse : Robuste")).toBeVisible();
  });

  test("le Bénin est le seul pays ouvert au lancement", async ({ page }) => {
    await page.goto("/register");
    const country = page.getByLabel("Pays");
    await expect(country).toHaveValue("BJ");
    await expect(country.locator("option", { hasText: "Togo" })).toBeDisabled();
  });
});

test.describe("connexion et récupération", () => {
  test("erreurs de validation et affichage du mot de passe", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Saisissez votre e-mail ou votre téléphone")).toBeVisible();
    const pwd = page.locator("#password");
    await pwd.fill("secret");
    await expect(pwd).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
    await expect(pwd).toHaveAttribute("type", "text");
    await expect(page.getByLabel("Se souvenir de moi")).toBeChecked();
    await expect(page.getByRole("link", { name: /Mot de passe oublié/ })).toHaveAttribute("href", "/forgot-password");
  });

  test("mot de passe oublié : validation de l'e-mail", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Adresse e-mail").fill("invalide");
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText("Adresse e-mail invalide")).toBeVisible();
  });

  test("lien de confirmation invalide → message clair", async ({ page }) => {
    await page.goto("/login?error=link");
    await expect(page.getByText("Lien invalide ou expiré")).toBeVisible();
  });
});
