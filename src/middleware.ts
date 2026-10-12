import { NextResponse, type NextRequest } from "next/server";
import { decideInternalAccess } from "@/internal/access";

/** Gates the internal documentation portal. Product routes are untouched. */
export function middleware(request: NextRequest) {
  const access = decideInternalAccess({
    nodeEnv: process.env.NODE_ENV,
    password: process.env.INTERNAL_DOCS_PASSWORD,
    authorization: request.headers.get("authorization"),
  });
  if (access === "not_found") {
    return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }
  if (access === "challenge") {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="MarginMint internal", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/internal", "/internal/:path*"] };
