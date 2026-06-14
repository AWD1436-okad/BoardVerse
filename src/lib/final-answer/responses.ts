import { NextResponse } from "next/server";

export function jsonError(
  message: string,
  status: number,
  code = "request_error",
) {
  return NextResponse.json({ code, message, ok: false }, { status });
}

export function setupRequired(missing: string[]) {
  return NextResponse.json(
    {
      code: "setup_required",
      message:
        "Supabase is not configured yet. Add the required environment variables before real accounts can be saved.",
      missing,
      ok: false,
    },
    { status: 503 },
  );
}
