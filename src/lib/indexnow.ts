import { publicEnv } from "@/lib/env";

/**
 * IndexNow : signale instantanément les pages nouvelles ou modifiées à Bing (et donc DuckDuckGo,
 * Yahoo, Ecosia), Yandex, Seznam, Naver… La clé n'est pas un secret : elle est publiée à la racine
 * du site (/6d50e633b55624e6468266ccac9b6abf.txt) pour prouver que le site nous appartient.
 */
export const INDEXNOW_KEY = "6d50e633b55624e6468266ccac9b6abf";

export function publicSeoUrls(categorySlugs: string[] = []): string[] {
  const base = publicEnv.siteUrl;
  const statics = ["", "/jobs", "/map", "/categories", "/about", "/how-it-works", "/faq", "/contact", "/terms", "/privacy"];
  return [...statics.map((p) => `${base}${p || "/"}`), ...categorySlugs.map((s) => `${base}/jobs?category=${s}`)];
}

export async function submitIndexNow(urls: string[], fetcher: typeof fetch = fetch): Promise<{ ok: boolean; status: number }> {
  const host = new URL(publicEnv.siteUrl).host;
  const res = await fetcher("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${publicEnv.siteUrl}/${INDEXNOW_KEY}.txt`, urlList: urls.slice(0, 10000) }),
    signal: AbortSignal.timeout(10000),
  });
  return { ok: res.ok, status: res.status };
}
