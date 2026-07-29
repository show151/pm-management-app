// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

const { GET: baseGET, POST: basePOST } = toNextJsHandler(auth);

function addNoCacheHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-cache, no-store, must-revalidate, private");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(request: Request) {
  const response = await baseGET(request);
  return addNoCacheHeaders(response);
}

export async function POST(request: Request) {
  const response = await basePOST(request);
  return addNoCacheHeaders(response);
}