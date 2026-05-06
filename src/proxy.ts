import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role?.toLowerCase();

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = ["/login", "/"].includes(nextUrl.pathname);
  
  // Protected path patterns
  const roleRoutes = ["/admin", "/manager", "/accountant", "/tenant"];
  const isProtectedRoute = roleRoutes.some(route => nextUrl.pathname.startsWith(route));

  if (isApiAuthRoute) return NextResponse.next();

  if (isPublicRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(`/${userRole || "tenant"}/dashboard`, nextUrl));
    }
    if (nextUrl.pathname === "/") {
       return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.next();
  }

  if (isProtectedRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }

    // Extract role from URL (e.g., /admin/dashboard -> admin)
    const urlRole = nextUrl.pathname.split("/")[1];
    
    // Role mismatch protection
    if (urlRole && urlRole !== userRole) {
      return NextResponse.redirect(new URL(`/${userRole}/dashboard`, nextUrl));
    }

    return NextResponse.next();
  }

  // Handle root and legacy dashboard redirects
  if (nextUrl.pathname.startsWith("/dashboard")) {
     return NextResponse.redirect(new URL(`/${userRole || "tenant"}/dashboard`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
