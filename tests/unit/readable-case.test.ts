import { describe, expect, it } from "vitest";
import { readableCase } from "@/lib/utils/format";

describe("readableCase", () => {
  it("convertit un texte tout en majuscules en casse de phrase", () => {
    expect(readableCase("JE CHERCHE UN ARCHITECTE PRET DE CHEZ MOI")).toBe("Je cherche un architecte pret de chez moi");
  });
  it("met une majuscule après chaque fin de phrase", () => {
    expect(readableCase("RÉPARATION URGENTE. MERCI DE VENIR TÔT !\nPAIEMENT À LA FIN")).toBe("Réparation urgente. Merci de venir tôt !\nPaiement à la fin");
  });
  it("laisse intacts les textes déjà bien écrits", () => {
    expect(readableCase("Installation d'un climatiseur LG à Cotonou")).toBe("Installation d'un climatiseur LG à Cotonou");
  });
  it("ignore les textes très courts (sigles)", () => {
    expect(readableCase("BTP")).toBe("BTP");
  });
});
