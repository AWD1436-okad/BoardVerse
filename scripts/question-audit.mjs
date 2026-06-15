import questions from "../src/lib/final-answer/starter-questions.json" with { type: "json" };
import { starterFastestFingerQuestions } from "../src/lib/final-answer/starter-fastest-finger-questions.js";

const prizes = [
  100, 500, 1000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000,
  1000000,
];
const answerKeys = ["A", "B", "C", "D"];
const bannedTerms = [
  /relig/i,
  /church/i,
  /mosque/i,
  /temple prayer/i,
  /celebrity/i,
  /president/i,
  /prime minister/i,
  /\belection\b/i,
  /\bpolitic/i,
];

function fail(message) {
  throw new Error(message);
}

function assertNoBannedText(label, values) {
  for (const value of values) {
    for (const pattern of bannedTerms) {
      if (pattern.test(String(value))) {
        fail(`${label} contains banned term ${pattern}: ${value}`);
      }
    }
  }
}

if (questions.length !== 1200) {
  fail(`Expected 1,200 Hot Seat questions, found ${questions.length}.`);
}

const questionTexts = new Set();
const byLevel = new Map();
const answerBalance = Object.fromEntries(answerKeys.map((key) => [key, 0]));

for (const question of questions) {
  if (questionTexts.has(question.question_text)) {
    fail(`Duplicate question text: ${question.question_text}`);
  }
  questionTexts.add(question.question_text);

  if (!Number.isInteger(question.level) || question.level < 1 || question.level > 12) {
    fail(`Invalid level for question: ${question.question_text}`);
  }

  if (question.prize_amount !== prizes[question.level - 1]) {
    fail(`Prize mismatch for level ${question.level}: ${question.question_text}`);
  }

  for (const field of ["answer_a", "answer_b", "answer_c", "answer_d"]) {
    if (!String(question[field] ?? "").trim()) {
      fail(`Missing ${field}: ${question.question_text}`);
    }
  }

  if (!answerKeys.includes(question.correct_answer)) {
    fail(`Invalid correct answer ${question.correct_answer}: ${question.question_text}`);
  }

  answerBalance[question.correct_answer] += 1;
  byLevel.set(question.level, (byLevel.get(question.level) ?? 0) + 1);
  assertNoBannedText("Hot Seat question", [
    question.question_text,
    question.answer_a,
    question.answer_b,
    question.answer_c,
    question.answer_d,
  ]);
}

for (let level = 1; level <= 12; level += 1) {
  if (byLevel.get(level) !== 100) {
    fail(`Expected 100 questions at level ${level}, found ${byLevel.get(level) ?? 0}.`);
  }
}

for (const key of answerKeys) {
  if (answerBalance[key] !== 300) {
    fail(`Expected 300 correct answers for ${key}, found ${answerBalance[key]}.`);
  }
}

const fastestPrompts = new Set();
for (const question of starterFastestFingerQuestions) {
  if (fastestPrompts.has(question.prompt)) {
    fail(`Duplicate Fastest Finger prompt: ${question.prompt}`);
  }
  fastestPrompts.add(question.prompt);

  if (!Array.isArray(question.correct_order) || question.correct_order.length !== 4) {
    fail(`Invalid Fastest Finger correct order: ${question.prompt}`);
  }

  if (new Set(question.correct_order).size !== 4) {
    fail(`Repeated Fastest Finger order key: ${question.prompt}`);
  }

  for (const key of question.correct_order) {
    if (!["item_1", "item_2", "item_3", "item_4"].includes(key)) {
      fail(`Invalid Fastest Finger order key ${key}: ${question.prompt}`);
    }
  }

  assertNoBannedText("Fastest Finger question", [
    question.prompt,
    question.item_1,
    question.item_2,
    question.item_3,
    question.item_4,
  ]);
}

console.log("Question audit passed.");
console.log(`Hot Seat questions: ${questions.length}`);
console.log(
  `Level counts: ${[...byLevel.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => `${level}:${count}`)
    .join(", ")}`,
);
console.log(
  `Correct-answer balance: ${answerKeys
    .map((key) => `${key}:${answerBalance[key]}`)
    .join(", ")}`,
);
console.log(`Fastest Finger questions: ${starterFastestFingerQuestions.length}`);
