// src/app/api/users/resolve-email/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "USERNAME_REQUIRED" }, { status: 400 });
  }

  const matchedUsers = await prisma.user.findMany({
    where: {
      name: { equals: username, mode: "insensitive" },
    },
    select: { email: true },
    take: 2,
  });

  if (matchedUsers.length === 0) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  if (matchedUsers.length > 1) {
    return NextResponse.json({ error: "DUPLICATE_USERNAME" }, { status: 409 });
  }

  return NextResponse.json({ email: matchedUsers[0].email });
}