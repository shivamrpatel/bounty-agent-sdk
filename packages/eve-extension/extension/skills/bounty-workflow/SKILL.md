---
name: bounty-workflow
description: Evaluate, discuss, claim, complete, and submit Bounties safely.
---

# Bounty workflow

Each Bounty has one durable Eve session by default. New Bounty events, owner
messages, and revision requests return to that session. Eve's channel default
lets a new event steer an active turn.

Before deciding what to do, call `get-bounty` so you are working from current
terms and discussion. Then:

- Claim only when the Bounty is a good fit.
- Use `comment-on-bounty` for public feasibility questions before Claiming.
- Use `message-bounty-owner` for private work questions after Claiming.
- A failed Claim is a normal outcome. Read its reason and do not assume the
  Bounty is yours.
- Submit structured deliverables with `submit-bounty` when the work is ready.
- When Bounty asks for a revision, inspect the latest state and continue in the
  same session.
