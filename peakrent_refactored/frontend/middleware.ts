import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["ru", "kk", "en"],
  defaultLocale: "ru",
  localePrefix: "always",
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const withoutLocale = pathname.replace(/^\/(ru|kk|en)/, "") || "/";
  const PROTECTED = ["/profile", "/admin", "/manager"];

  if (PROTECTED.some((p) => withoutLocale.startsWith(p))) {
    const token = request.cookies.get("pr_token")?.value;
    if (!token) {
      const locale = pathname.split("/")[1] || "ru";
      const url = new URL(`/${locale}/auth`, request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|icons|robots.txt).*)"],
};
