import { NextResponse } from "next/server";
import { getFounderAccessConfig } from "@/lib/final-answer/founder-access-config";

export const runtime = "nodejs";

function safeEnvLength(key: string) {
  const value = process.env[key];

  return {
    exists: typeof value === "string",
    length: typeof value === "string" ? value.length : 0,
    trimmedEmpty: (value?.trim() ?? "").length === 0,
  };
}

export async function GET() {
  const founder = getFounderAccessConfig();

  return NextResponse.json({
    founder,
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? null,
      vercel: safeEnvLength("VERCEL"),
      vercelCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelGitRepo: process.env.VERCEL_GIT_REPO_SLUG ?? null,
      vercelProjectName:
        process.env.VERCEL_PROJECT_NAME ??
        process.env.VERCEL_GIT_REPO_SLUG ??
        null,
      vercelProjectProductionUrl:
        process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
      vercelRegion: process.env.VERCEL_REGION ?? null,
      vercelUrl: process.env.VERCEL_URL ?? null,
    },
  });
}
