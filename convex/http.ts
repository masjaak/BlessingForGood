import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  IMAGE_CONTENT_TYPES,
  MAX_STORED_FILE_BYTES,
  PROOF_CONTENT_TYPES,
  normalizeContentType,
  validateUploadedContent,
} from "./lib/storage";
import type { UploadPurpose } from "./uploads";

const http = httpRouter();

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = new Set([
    "https://www.blessingforgood.com",
    "https://blessingforgood.com",
    "http://localhost:3000",
    "http://localhost:3100",
  ]);
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-BFG-File-Size",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : "null",
    Vary: "Origin",
  };
}

function json(origin: string | null, body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" },
  });
}

const purposeContracts: Record<UploadPurpose, ReadonlySet<string>> = {
  "book-cover": IMAGE_CONTENT_TYPES,
  "book-gallery": IMAGE_CONTENT_TYPES,
  "payment-proof": PROOF_CONTENT_TYPES,
  "deposit-proof": PROOF_CONTENT_TYPES,
};

function isUploadPurpose(value: string | null): value is UploadPurpose {
  return value !== null && value in purposeContracts;
}

http.route({
  path: "/bfg/upload",
  method: "OPTIONS",
  handler: httpAction(
    async (_ctx, request) => new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin")) }),
  ),
});

http.route({
  path: "/bfg/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const params = new URL(request.url).searchParams;
    const purpose = params.get("purpose");
    const fileName = params.get("fileName");
    const declaredMimeType = normalizeContentType(request.headers.get("Content-Type"));
    if (!isUploadPurpose(purpose) || !fileName || !declaredMimeType) {
      return json(origin, { error: "file upload rejected" }, 400);
    }

    const contentLength = Number(request.headers.get("X-BFG-File-Size") || request.headers.get("Content-Length"));
    if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_STORED_FILE_BYTES) {
      return json(origin, { error: "file upload rejected" }, 413);
    }

    try {
      await ctx.runMutation(internal.uploads.authorize, { purpose });
      const body = await request.blob();
      if (body.size !== contentLength || body.size > MAX_STORED_FILE_BYTES) {
        return json(origin, { error: "file upload rejected" }, 413);
      }
      const bytes = new Uint8Array(await body.arrayBuffer());
      validateUploadedContent(
        fileName,
        declaredMimeType,
        declaredMimeType,
        body.size,
        bytes,
        purposeContracts[purpose],
        "file upload rejected",
      );
      const storageId = await ctx.storage.store(new Blob([bytes.buffer], { type: declaredMimeType }));
      try {
        await ctx.runMutation(internal.uploads.register, { storageId, purpose });
      } catch {
        await ctx.storage.delete(storageId);
        throw new Error("upload claim failed");
      }
      return json(origin, { storageId }, 200);
    } catch {
      return json(origin, { error: "file upload rejected" }, 400);
    }
  }),
});

export default http;
