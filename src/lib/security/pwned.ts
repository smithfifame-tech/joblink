import "server-only";
import { createHash } from "node:crypto";

/**
 * Vérifie si un mot de passe figure dans des fuites de données connues (base Have I Been Pwned),
 * par « k-anonymat » : seuls les 5 premiers caractères de l'empreinte SHA-1 quittent le serveur,
 * jamais le mot de passe ni son empreinte complète. En cas d'indisponibilité du service,
 * la vérification est ignorée (on ne bloque pas l'inscription pour autant).
 */
export async function isPasswordPwned(password: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetcher(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "JOBLINK-password-check" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [s, count] = line.trim().split(":");
      if (s === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const PWNED_MESSAGE =
  "Ce mot de passe apparaît dans des fuites de données connues : il serait facile à deviner. Choisissez-en un autre.";
