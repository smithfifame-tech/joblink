import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, safeNext } from "@/lib/validations/auth";
import { normalizePhone } from "@/lib/validations/common";
import { applicationSchema, jobSchema, parseSearchParams, todayISO } from "@/lib/validations/jobs";
import { safeStorageName, validateFile } from "@/lib/validations/profile";

const validRegister = {
  firstName: "Aïcha",
  lastName: "Dossou",
  email: "Aicha@Exemple.BJ",
  phone: "01 97 12 34 56",
  password: "Motdepasse#2026",
  confirmPassword: "Motdepasse#2026",
  country: "BJ",
  city: "Cotonou",
  neighborhood: "Akpakpa",
  accountType: "worker",
  acceptTerms: true,
  website: "",
};

describe("inscription", () => {
  it("accepte un client et un travailleur valides, normalise l'e-mail", () => {
    const r = registerSchema.safeParse(validRegister);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("aicha@exemple.bj");
    expect(registerSchema.safeParse({ ...validRegister, accountType: "client" }).success).toBe(true);
  });
  it("refuse le type de compte admin (attribution serveur uniquement)", () => {
    expect(registerSchema.safeParse({ ...validRegister, accountType: "admin" }).success).toBe(false);
  });
  it("exige l'acceptation des conditions", () => {
    expect(registerSchema.safeParse({ ...validRegister, acceptTerms: false }).success).toBe(false);
  });
  it("exige un mot de passe robuste et identique", () => {
    expect(registerSchema.safeParse({ ...validRegister, password: "court", confirmPassword: "court" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, password: "sansmajuscule#1", confirmPassword: "sansmajuscule#1" }).success).toBe(false);
    const mismatch = registerSchema.safeParse({ ...validRegister, confirmPassword: "Autre#Motdepasse1" });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) expect(mismatch.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
  it("refuse un e-mail invalide et un numéro invalide", () => {
    expect(registerSchema.safeParse({ ...validRegister, email: "pas-un-email" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, phone: "12345" }).success).toBe(false);
  });
  it("le champ piège rempli est détecté", () => {
    expect(registerSchema.safeParse({ ...validRegister, website: "http://spam" }).success).toBe(false);
  });
});

describe("téléphone", () => {
  it("normalise les numéros béninois (nouveau format à 10 chiffres et ancien à 8)", () => {
    expect(normalizePhone("01 97 12 34 56")).toBe("+2290197123456");
    expect(normalizePhone("+229 97 12 34 56")).toBe("+22997123456");
    expect(normalizePhone("0022901971234 56")).toBe("+2290197123456");
  });
  it("refuse les formats incohérents", () => {
    expect(normalizePhone("+229 123")).toBeNull();
    expect(normalizePhone("+229 9712345678")).toBeNull(); // 10 chiffres sans le préfixe 01
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("connexion et redirections", () => {
  it("valide les champs obligatoires", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: "a@b.bj", password: "x", remember: true }).success).toBe(true);
  });
  it("n'autorise que des redirections internes (pas d'open redirect)", () => {
    expect(safeNext("/client/dashboard")).toBe("/client/dashboard");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

const tomorrow = () => {
  const d = new Date(`${todayISO()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const validJob = {
  title: "Réparer une fuite sous l'évier",
  categoryId: "3f1c6c4e-8a2b-4c1d-9e0f-1a2b3c4d5e6f",
  description: "Fuite au niveau du siphon de la cuisine, intervention rapide souhaitée.",
  skills: ["Plomberie"],
  budget: "10 000",
  payType: "fixed",
  allowPriceProposal: true,
  startDate: todayISO(),
  deadline: tomorrow(),
  country: "BJ",
  city: "Cotonou",
  neighborhood: "Cadjèhoun",
  address: "",
  workMode: "on_site",
  lat: 6.357,
  lng: 2.391,
  workersNeeded: "1",
  intent: "publish",
};

describe("publication de mission", () => {
  it("accepte une mission valide et convertit le budget « 10 000 »", () => {
    const r = jobSchema.safeParse(validJob);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.budget).toBe(10000);
      expect(r.data.workersNeeded).toBe(1);
    }
  });
  it("exige une localisation sur carte pour une mission sur place", () => {
    expect(jobSchema.safeParse({ ...validJob, lat: null, lng: null }).success).toBe(false);
    expect(jobSchema.safeParse({ ...validJob, lat: null, lng: null, workMode: "remote" }).success).toBe(true);
  });
  it("refuse une date limite antérieure au début ou dépassée", () => {
    expect(jobSchema.safeParse({ ...validJob, startDate: tomorrow(), deadline: todayISO() }).success).toBe(false);
    expect(jobSchema.safeParse({ ...validJob, startDate: "2020-01-01", deadline: "2020-01-02" }).success).toBe(false);
  });
  it("borne le budget et le nombre de travailleurs", () => {
    expect(jobSchema.safeParse({ ...validJob, budget: 100 }).success).toBe(false);
    expect(jobSchema.safeParse({ ...validJob, budget: 10000.5 }).success).toBe(false);
    expect(jobSchema.safeParse({ ...validJob, workersNeeded: 0 }).success).toBe(false);
    expect(jobSchema.safeParse({ ...validJob, workersNeeded: 51 }).success).toBe(false);
  });
  it("supprime les caractères de contrôle", () => {
    const r = jobSchema.safeParse({ ...validJob, title: "Réparer\u0000 une fuite urgente" });
    expect(r.success && r.data.title).toBe("Réparer une fuite urgente");
  });
});

describe("candidature", () => {
  it("prix proposé facultatif", () => {
    const base = { jobId: validJob.categoryId, coverLetter: "Je suis disponible demain matin avec mon matériel." };
    expect(applicationSchema.parse({ ...base, proposedAmount: "" }).proposedAmount).toBeNull();
    expect(applicationSchema.parse({ ...base, proposedAmount: "8 000" }).proposedAmount).toBe(8000);
    expect(applicationSchema.safeParse({ ...base, coverLetter: "trop court" }).success).toBe(false);
  });
});

describe("recherche publique", () => {
  it("ignore silencieusement les paramètres invalides", () => {
    const p = parseSearchParams({ q: "plombier", radius: "7", lat: "6.37", lng: "2.39", category: "<script>", page: "-3", sort: "distance" });
    expect(p).toEqual({ q: "plombier", lat: 6.37, lng: 2.39, sort: "distance" });
  });
  it("accepte les rayons 1, 5, 10, 20 et 50 km", () => {
    for (const r of ["1", "5", "10", "20", "50"]) expect(parseSearchParams({ radius: r }).radius).toBe(Number(r));
  });
});

describe("fichiers envoyés", () => {
  it("contrôle le type et la taille", () => {
    expect(validateFile({ size: 1000, type: "image/png" }, "avatar")).toBeNull();
    expect(validateFile({ size: 3 * 1024 * 1024, type: "image/png" }, "avatar")).toMatch(/volumineux/);
    expect(validateFile({ size: 1000, type: "application/x-msdownload" }, "attachment")).toMatch(/Format/);
    expect(validateFile({ size: 0, type: "image/png" }, "proof")).toMatch(/vide/);
  });
  it("génère des noms Storage sûrs (pas de traversée de chemin)", () => {
    const n = safeStorageName("../../etc/passwd.png", "image/png");
    expect(n).not.toContain("/");
    expect(n).not.toContain("..");
    expect(n.endsWith(".png")).toBe(true);
    expect(safeStorageName("facture.exe", "application/pdf").endsWith(".pdf")).toBe(true);
  });
});
