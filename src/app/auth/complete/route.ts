import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth/config";
import { GUEST_HANDOFF_COOKIE } from "@/auth/constants";
import { verifyGuestHandoffToken } from "@/auth/guest-handoff";
import { mergeGuestIntoUser } from "@/auth/merge-guest";
import { applySecurityHeaders } from "@/lib/http";

function redirectAndClearHandoff(
  request: NextRequest,
  destination: "/chat" | "/login",
): NextResponse {
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.delete(GUEST_HANDOFF_COOKIE);
  applySecurityHeaders(response);

  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id || session.user.isGuest) {
    return redirectAndClearHandoff(request, "/login");
  }

  const handoff = request.cookies.get(GUEST_HANDOFF_COOKIE)?.value;
  if (handoff) {
    const guestId = await verifyGuestHandoffToken(handoff);

    if (guestId) {
      await mergeGuestIntoUser({
        guestId,
        userId: session.user.id,
      });
    }
  }

  return redirectAndClearHandoff(request, "/chat");
}
