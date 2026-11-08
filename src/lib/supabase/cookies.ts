/** Cookie indiquant que l'utilisateur n'a pas coché « Se souvenir de moi » (session navigateur uniquement). */
export const SESSION_ONLY_COOKIE = "jl_session_only";

type CookieOpts = { maxAge?: number; expires?: Date; [k: string]: unknown };

/** Supprime la persistance des cookies de session si « Se souvenir de moi » est décoché. */
export function applySessionPreference<T extends CookieOpts>(options: T, sessionOnly: boolean): T {
  if (!sessionOnly) return options;
  const { maxAge: _m, expires: _e, ...rest } = options;
  void _m;
  void _e;
  return rest as T;
}
