import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * In development, skip auth so we can preview the app without Google OAuth.
 * In production, protect /contractor/* routes and ensure proper role routing.
 */
export async function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const pathname = req.nextUrl.pathname;

  // Protect contractor routes
  if (pathname.startsWith("/contractor")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // If not authenticated or not a contractor, redirect to contractor login
    if (!token || token.role !== "contractor") {
      return NextResponse.redirect(new URL("/contractor-login", req.url));
    }
  }

  // Redirect contractor-login to /contractor if already authenticated as contractor
  if (pathname === "/contractor-login") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.role === "contractor") {
      return NextResponse.redirect(new URL("/contractor", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|contractor-login|api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
