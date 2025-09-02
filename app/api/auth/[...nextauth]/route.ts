import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "./auth-options";
import { config } from "@/lib/config";

const handler = NextAuth(authOptions);

export async function GET(req: NextRequest, ctx: any) {
  if (!config.authEnabled) return new Response("Not found", { status: 404 });
  return handler(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
  if (!config.authEnabled) return new Response("Not found", { status: 404 });
  return handler(req, ctx);
}

// (No other exports here)
