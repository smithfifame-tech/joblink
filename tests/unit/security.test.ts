import { describe, expect, it } from "vitest";
import { memoryRateLimit } from "@/lib/security/rate-limit";
import { translateError } from "@/lib/errors";
import { isProtectedPath } from "@/lib/supabase/middleware";
import { applySessionPreference } from "@/lib/supabase/cookies";

describe("limitation de débit", () => {
  it("bloque au-delà du maximum puis réautorise après la fenêtre", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(memoryRateLimit("login:test", 5, 60, t0)).toBe(true);
    expect(memoryRateLimit("login:test", 5, 60, t0 + 1000)).toBe(false);
    expect(memoryRateLimit("login:test", 5, 60, t0 + 61_000)).toBe(true);
  });
});

describe("protection des routes", () => {
  it("identifie les espaces privés", () => {
    for (const p of ["/client/dashboard", "/worker/jobs", "/admin", "/admin/users", "/messages/abc", "/notifications"]) expect(isProtectedPath(p)).toBe(true);
    for (const p of ["/", "/jobs", "/jobs/123", "/login", "/clients-celebres", "/administratif"]) expect(isProtectedPath(p)).toBe(false);
  });
});

describe("session « Se souvenir de moi »", () => {
  it("retire la persistance des cookies si décoché", () => {
    expect(applySessionPreference({ maxAge: 3600, path: "/" }, true)).toEqual({ path: "/" });
    expect(applySessionPreference({ maxAge: 3600, path: "/" }, false)).toEqual({ maxAge: 3600, path: "/" });
  });
});

describe("messages d'erreur", () => {
  it("traduit les codes métier sans exposer de détail technique", () => {
    expect(translateError({ message: "ALREADY_APPLIED" })).toMatch(/déjà candidaté/);
    expect(translateError({ message: "new row violates row-level security policy" })).toBe("Accès refusé.");
    expect(translateError(new Error("relation secret_table does not exist"))).toMatch(/erreur inattendue/);
    expect(translateError("TypeError: fetch failed")).toMatch(/connexion/);
  });
});
