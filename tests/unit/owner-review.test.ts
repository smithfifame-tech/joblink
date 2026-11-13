import { describe, expect, it } from "vitest";
import { announcementIssues, jobAlerts, type WatchJob } from "@/lib/owner-panel/review";
import { formatRate, withRate } from "@/lib/payments/commission";

describe("formatRate / withRate", () => {
  it("affiche le taux à la française", () => {
    expect(formatRate(0.05)).toBe("5 %");
    expect(formatRate(0.075)).toBe("7,5 %");
    expect(withRate("Commission de {taux} seulement", "10 %")).toBe("Commission de 10 % seulement");
  });
});

describe("relecture de l'annonce", () => {
  const ids = (msg: string, rate = 0.05) => announcementIssues(msg, rate).map((i) => i.id);

  it("repère un taux annoncé différent du taux appliqué, les majuscules et les fautes", () => {
    const issues = announcementIssues("CHAQUE COMMISION SERA PRELEVER DE 10%", 0.05);
    expect(issues.map((i) => i.id)).toEqual(["rate", "caps", "spelling", "percent-space"]);
    expect(issues[0].level).toBe("error");
    expect(issues[0].fix).toBe("CHAQUE COMMISION SERA PRELEVER DE 5 %");
    expect(issues[1].fix).toBe("Chaque commission sera prélevée de 10%");
    expect(issues[2].fix).toBe("CHAQUE COMMISSION SERA PRÉLEVÉE DE 10%");
  });

  it("ne signale rien pour un message correct", () => {
    expect(ids("Bienvenue sur JOBLINK ! Publiez votre première mission gratuitement.")).toEqual([]);
    expect(ids("La commission reste de 5 % sur les missions payées.")).toEqual([]);
    expect(ids("Nouveau taux : 10 % de commission.", 0.1)).toEqual([]);
  });

  it("ignore les pourcentages sans rapport avec les frais", () => {
    expect(ids("Déjà 50 % de missions en plus ce mois-ci !")).toEqual([]);
  });

  it("signale les messages trop longs pour le téléphone", () => {
    expect(ids("Bienvenue sur JOBLINK. ".repeat(6))).toContain("length");
  });
});

describe("missions à surveiller", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const base: WatchJob = {
    id: "1", title: "Réparer une fuite", budget_amount: 15000, pay_type: "fixed", status: "published", is_hidden: false,
    created_at: "2026-11-12T10:00:00Z", deadline: "2026-11-30", applications_count: 0,
  };

  it("ne remonte pas une mission saine et récente", () => {
    expect(jobAlerts([base], now)).toEqual([]);
  });

  it("repère échéance dépassée, absence de candidature, titre en majuscules et budget suspect", () => {
    const alerts = jobAlerts(
      [
        { ...base, id: "a", created_at: "2026-11-08T10:00:00Z" },
        { ...base, id: "b", deadline: "2026-11-10" },
        { ...base, id: "c", title: "CHERCHE PLOMBIER URGENT" },
        { ...base, id: "d", pay_type: "hourly", budget_amount: 100000 },
        { ...base, id: "e", deadline: "2026-11-01", is_hidden: true },
        { ...base, id: "f", status: "completed", deadline: "2026-11-01" },
      ],
      now,
    );
    expect(alerts.map((a) => a.job.id)).toEqual(["b", "d", "a", "c"]);
    expect(alerts.find((a) => a.job.id === "a")?.issues[0].label).toBe("Aucune candidature depuis 5 jours");
    expect(alerts.find((a) => a.job.id === "d")?.issues[0].kind).toBe("budget");
  });
});
