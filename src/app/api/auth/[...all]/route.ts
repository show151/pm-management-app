// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}

async function handleRequest(request: NextRequest) {
  // Next.js 16 Turbopack consumes the body, so we need to read it and reconstruct
  const url = new URL(request.url);
  let bodyText: string | undefined;
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      bodyText = await request.text();
    }
  } catch {
    // body already consumed
  }

  const newRequest = new Request(url, {
    method: request.method,
    headers: new Headers(request.headers),
    body: bodyText || undefined,
  });

  return auth.handler(newRequest);
}