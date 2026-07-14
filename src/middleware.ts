export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/documents/:path*", "/api/documents/:path*"],
};
