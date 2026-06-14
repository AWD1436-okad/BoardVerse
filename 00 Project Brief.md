# Final Answer Project Brief

## Product

Final Answer is a private online quiz game for friends and family, using original branding and assets. It should feel like a premium TV quiz show without copying protected logos, music, graphics, fonts, or exact assets from any existing show.

Public domain: `https://playsgrid.org`.

The previous PlayGrid board-game product is retired for this repo and may be erased/replaced. BoardVerse and PlayGrid are old working names only.

## Audience

Friends and family, mainly tweens and teens, plus older family members.

## Platform

Browser-based web app only. No mobile app, offline mode, public matchmaking, real-money features, or exact copyrighted TV-show branding.

## Accounts

Anyone visiting the website can create an account with:
- Username.
- Display name.
- 4-digit PIN.

Usernames cannot be changed later. PINs must not be stored in plain text.

## Rooms

- Private rooms only.
- Join by room code.
- No public room list.
- 2-10 players per room.
- Host chooses player count.
- Players press Ready.
- Game starts only when selected player count has joined and everyone is ready.
- If host leaves, a new host is chosen automatically.
- If a player leaves during a game, they cannot rejoin that same game.

## Game Format

- One turn per player.
- After a player finishes their turn, they are done for that game.
- After each turn, everyone except players who already played competes in Fastest Finger First again.
- Highest final prize wins.
- Tied players share the same place. No tiebreaker.

## Fastest Finger First

- Players arrange 4 answers in the correct order.
- Fastest correct player enters the hot seat.
- Timer: 30 seconds.
- Timing should be handled fairly by the server where possible.

## Money Ladder

1. $100
2. $500
3. $1,000
4. $4,000
5. $8,000
6. $16,000
7. $32,000
8. $64,000
9. $125,000
10. $250,000
11. $500,000
12. $1,000,000

Safety nets: `$1,000` and `$32,000`.

## Lifelines

Include:
- 50:50.
- Ask The Audience with generated percentages.
- Pass.

Do not include Phone a Friend.

## Questions

The database should support 1,200 generated questions: 100 per level across 12 levels.

Question rules:
- No religious questions.
- No questions about people.
- No celebrity trivia.
- No politics-focused questions.
- No maths-heavy questions.
- Suitable for tweens and teens.
- Challenging through wording and believable wrong answers, not obscure trivia.

Preferred categories include geography, science, nature, space, technology, landmarks, languages, food and drink, weather and climate, transport, oceans and rivers, buildings and architecture, and general knowledge.

Questions must support text, four answers, correct answer, level, prize amount, category, optional explanation, active/inactive status, report count, and created date.

Players can report questions for wrong answer, ambiguous wording, typo, or other.

## Visual Style

Premium quiz-show style:
- Dark navy / black background.
- Deep blue answer boxes.
- Gold highlights.
- Orange selected answer.
- Green correct answer.
- Red wrong answer.
- Dramatic original 30-second flare timer.
- Original Final Answer logo and visual identity.

