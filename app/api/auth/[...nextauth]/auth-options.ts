import type { NextAuthOptions } from "next-auth";
import { config } from "@/lib/config";

const issuer = (config.oidc.issuer || "").replace(/\/+$/, "");

const OIDCProvider = issuer && {
  id: "oidc",
  name: "OIDC",
  type: "oauth",
  wellKnown: `${issuer}/.well-known/openid-configuration`,
  clientId: config.oidc.clientId,
  clientSecret: config.oidc.clientSecret,
  checks: ["pkce", "state"] as const,
  authorization: { params: { scope: "openid email profile" } },
  idToken: true,
  profile(profile: any) {
    return {
      id: profile.sub,
      name: profile.name ?? profile.preferred_username ?? null,
      email: profile.email ?? null,
      image: profile.picture ?? null,
    };
  },
};

export const authOptions: NextAuthOptions = {
  secret: config.oidc.nextAuthSecret,
  providers: OIDCProvider ? [OIDCProvider as any] : [],
  session: { strategy: "jwt", maxAge: config.sessionMaxAgeSeconds },
  cookies: {
    sessionToken: {
      name: config.sessionCookieName,
      options: { httpOnly: true, sameSite: "strict", secure: true },
    },
  },
  callbacks: {
    async jwt({ token }) { return token; },
    async session({ session, token }) {
      (session as any).user = { id: String(token.sub || "unknown"), role: (token as any).role || "customer" };
      return session;
    },
  },
};
