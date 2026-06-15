import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { starterQuestions } from "./generate-question-seed.mjs";

function loadLocalEnv() {
  const envText = readFileSync(".env.local", "utf8");

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const splitAt = trimmed.indexOf("=");
    if (splitAt === -1) {
      continue;
    }

    const key = trimmed.slice(0, splitAt);
    let value = trimmed.slice(splitAt + 1);

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  throw new Error("Missing Supabase URL or server secret in .env.local.");
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const chunkSize = 50;
let inserted = 0;

for (let index = 0; index < starterQuestions.length; index += chunkSize) {
  const chunk = starterQuestions.slice(index, index + chunkSize);
  const { error } = await supabase.from("questions").upsert(chunk, {
    onConflict: "question_text",
  });

  if (error) {
    throw error;
  }

  inserted += chunk.length;
}

console.log(`Seeded ${inserted} questions.`);
