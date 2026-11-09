import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { isProbePath } from "@/lib/security/probes";

vi.mock("server-only", () => ({}));
const { isPasswordPwned } = await import("@/lib/security/pwned");

describe("blocage des scanners de vulnérabilités", () => {
  it("bloque les chemins de sondage classiques", () => {
    for (const p of ["/.env", "/.env.local", "/.git/config", "/wp-admin/", "/wp-login.php", "/xmlrpc.php", "/index.php", "/backup.sql", "/phpmyadmin/"]) {
      expect(isProbePath(p), p).toBe(true);
    }
  });
  it("laisse passer les pages du site", () => {
    for (const p of ["/", "/jobs", "/jobs/123", "/admin/joblink", "/categories", "/api/health", "/login", "/how-it-works"]) {
      expect(isProbePath(p), p).toBe(false);
    }
  });
});

describe("mots de passe compromis (k-anonymat)", () => {
  const sha = (s: string) => createHash("sha1").update(s).digest("hex").toUpperCase();

  it("n'envoie que les 5 premiers caractères de l'empreinte et détecte la fuite", async () => {
    const h = sha("motdepasse123");
    const fetcher = vi.fn(async (url: string) => new Response(`${h.slice(5)}:42\nAAAAA:0\n`, { status: 200 })) as unknown as typeof fetch;
    await expect(isPasswordPwned("motdepasse123", fetcher)).resolves.toBe(true);
    const url = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`);
    expect(url).not.toContain(h.slice(5));
  });

  it("accepte un mot de passe absent des fuites", async () => {
    const fetcher = (async () => new Response("0000000000000000000000000000000000A:3\n", { status: 200 })) as unknown as typeof fetch;
    await expect(isPasswordPwned("Un-Tres-Long-Mot-De-Passe-Unique-2026", fetcher)).resolves.toBe(false);
  });

  it("ne bloque pas si le service est indisponible", async () => {
    const fetcher = (async () => {
      throw new Error("réseau");
    }) as unknown as typeof fetch;
    await expect(isPasswordPwned("peu-importe", fetcher)).resolves.toBe(false);
  });
});

const { normalizeForFingerprint, cleanPath, incidentFingerprint } = await import("@/lib/monitoring/incidents");

describe("regroupement des incidents", () => {
  it("le même bug avec des identifiants différents donne la même empreinte", async () => {
    const a = await incidentFingerprint("server", "Cannot read job 3f2b8c1e-1111-4222-8333-944455556666 (ligne 12)", "/jobs/3f2b8c1e-1111-4222-8333-944455556666");
    const b = await incidentFingerprint("server", "Cannot read job 0a0b0c0d-1111-4222-8333-944455556666 (ligne 98)", "/jobs/0a0b0c0d-1111-4222-8333-944455556666");
    expect(a).toBe(b);
    expect(a).toHaveLength(40);
  });
  it("des bugs différents ont des empreintes différentes", async () => {
    expect(await incidentFingerprint("client", "TypeError: x", "/a")).not.toBe(await incidentFingerprint("client", "TypeError: y", "/a"));
  });
  it("le chemin ne garde ni paramètres ni identifiants", () => {
    expect(cleanPath("/jobs/3f2b8c1e-1111-4222-8333-944455556666?token=secret#x")).toBe("/jobs/:id");
    expect(cleanPath(null)).toBeNull();
    expect(normalizeForFingerprint("Erreur 404   sur  page 12")).toBe("erreur # sur page #");
  });
});

const { INDEXNOW_KEY, publicSeoUrls, submitIndexNow } = await import("@/lib/indexnow");

describe("IndexNow", () => {
  it("liste les pages publiques (jamais les espaces privés)", () => {
    const urls = publicSeoUrls(["plomberie"]);
    expect(urls.some((u) => u.endsWith("/jobs?category=plomberie"))).toBe(true);
    expect(urls.some((u) => /\/(admin|client|worker|login|register|api)\b/.test(u))).toBe(false);
  });
  it("envoie l'hôte, la clé et son emplacement", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    const r = await submitIndexNow(["https://exemple.test/"], fetcher);
    expect(r.ok).toBe(true);
    const [, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.key).toBe(INDEXNOW_KEY);
    expect(body.keyLocation).toMatch(new RegExp(`/${INDEXNOW_KEY}\\.txt$`));
    expect(body.urlList).toEqual(["https://exemple.test/"]);
  });
});
