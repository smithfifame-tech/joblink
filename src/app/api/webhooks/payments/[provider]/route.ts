import { NextResponse, type NextRequest } from "next/server";
import { processPaymentWebhook } from "@/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook des prestataires de paiement : /api/webhooks/payments/fedapay (ou /sandbox).
 * Le corps BRUT est lu pour vérifier la signature HMAC avant tout traitement.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = await req.text();
  if (raw.length > 256 * 1024) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const result = await processPaymentWebhook(provider, raw, req.headers);
  return NextResponse.json(result.body, { status: result.status });
}
