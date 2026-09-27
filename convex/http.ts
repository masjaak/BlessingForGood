import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
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
    "https://blessingforgood.vercel.app",
    "https://blessing-for-good.vercel.app",
    "https://blessing-for-good-masjaaks-projects.vercel.app",
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

function json(
  origin: string | null,
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      ...extraHeaders,
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function rateLimitDetails(error: unknown): { retryAfterSeconds: number } | null {
  if (!(error instanceof ConvexError) || typeof error.data !== "object" || error.data === null) return null;
  const data = error.data as { code?: unknown; retryAfterSeconds?: unknown };
  if (data.code !== "RATE_LIMITED" || typeof data.retryAfterSeconds !== "number") return null;
  const retryAfterSeconds = Math.max(1, Math.ceil(data.retryAfterSeconds));
  return Number.isFinite(retryAfterSeconds) ? { retryAfterSeconds } : null;
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

async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
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

    const declaredSizeHeader = request.headers.get("X-BFG-File-Size");
    const contentLengthHeader = request.headers.get("Content-Length");
    const declaredSize = declaredSizeHeader === null ? null : Number(declaredSizeHeader);
    const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
    if (
      (declaredSize !== null &&
        (!Number.isSafeInteger(declaredSize) || declaredSize < 0 || declaredSize > MAX_STORED_FILE_BYTES)) ||
      (contentLength !== null &&
        (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_STORED_FILE_BYTES))
    ) {
      return json(origin, { error: "file upload rejected" }, 413);
    }

    try {
      await ctx.runMutation(internal.uploads.authorize, { purpose });
      const bytes = await readBoundedBody(request, MAX_STORED_FILE_BYTES);
      if (
        !bytes ||
        (declaredSize !== null && bytes.byteLength !== declaredSize) ||
        (contentLength !== null && bytes.byteLength !== contentLength)
      ) {
        return json(origin, { error: "file upload rejected" }, 413);
      }
      validateUploadedContent(
        fileName,
        declaredMimeType,
        declaredMimeType,
        bytes.byteLength,
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
    } catch (error) {
      const limited = rateLimitDetails(error);
      if (limited) {
        return json(
          origin,
          {
            code: "RATE_LIMITED",
            error: "upload temporarily rate limited",
            retryAfterSeconds: limited.retryAfterSeconds,
          },
          429,
          { "Retry-After": String(limited.retryAfterSeconds) },
        );
      }
      return json(origin, { error: "file upload rejected" }, 400);
    }
  }),
});

export default http;
