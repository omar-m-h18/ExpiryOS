# D-001 to D-007 — Plain Summary

**What this is:** the work we will do next, explained without technical words.
**For:** you. The technical version lives in `technical-implementation-plan.md`.

---

## The order, and why

Seven changes. Each one is separate. Each one works on its own. If one causes trouble, we undo only that one.

| Step | What it does | Why it is here |
|---|---|---|
| 0 | Fix line endings in the files | Until this is done, every change looks huge and cannot be read properly |
| 1 | Repair the deploy pipeline and publish the fix | Nothing you want reaches visitors until this works |
| 2 | Move the empty-answer check into its own file and test it | Makes sure this bug can never come back |
| 3 | Move button logic out of the pages | Stops the same kind of mistake later |
| 4 | Remove the automatic sample data | The change you asked for |
| 5 | Build the empty-room screen | Replaces what the sample data used to do |
| 6 | Update the written notes | So the notes stop telling lies |
| 7 | Interactive & skippable tutorial | Lets users explore presets or dismiss immediately |
| 8 | High-visibility early access waitlist | Makes the email/waitlist button prominent & gently pushed |
| 9 | Calendar fix & category chips | Resolves collapsed calendar layout & speeds up item entry |

---

## Step 0 — Line endings

Your computer is set to change line breaks when it saves files. So Git sees about 150 files as changed when nothing in them actually changed.

We add one file that says "always use the standard line break". Then we fix all the files in a single commit that contains nothing else.

After this, a change to one file shows up as a change to one file.

---

## Step 1 — Repair the deploy

This is the step that fixes your delete button.

The fix is already written and has been sitting in your project since the end of August. It never reached the website, because the publish step quietly does nothing when it cannot log in, and still reports success.

We make three changes:

1. Tell the publish step to **fail** when it cannot log in, instead of pretending.
2. After publishing, check that the website answers. If it does not, the pipeline goes red.
3. Add a check that refuses to publish if the website still serves the old broken version. That exact old version is the one causing your problem, so we never ship it again by accident.

Then we push, and the delete button starts working.

**This is the step that matters most.** Until it works, nothing else you ask for can reach a real visitor.

---

## Step 2 — Test the empty-answer check

When the server deletes an item, it answers with "done, nothing to send". That is normal and correct.

The old website tried to read that answer as if it always contained something. On an empty answer, it stopped with an error. So the app said "delete failed" even though the delete worked.

The corrected code is already written. The problem is that **nothing tested it**. So it broke once, and nothing caught it.

We move that check into its own small file and write tests for every case, including the empty answer. Now if someone changes it wrongly, the tests shout before the code ships.

---

## Step 3 — Move button logic out of the pages

Right now the delete button's page holds three things at once: what to send, what to say afterwards, and what to refresh on screen.

That is why the delete bug was expensive to fix. You had to read a page to find out what the server does.

We move that into one small place, used by every button that changes data. The pages then only show things. One broken spot instead of several.

---

## Step 4 — Remove the automatic sample data

**This is your main request.** Here is what happens.

- A new visitor gets an empty room instead of 8 filled-in items.
- The server stops writing those 8 rows. Your Neon usage stops growing for visitors who just look and leave.
- The old code for making sample items stays, but it only runs if someone asks for it. It is off by default.

One thing changes that you should know about. The old code waited for the sample items to be written before showing the page. That wait existed so the page would never be empty. With no sample items, there is nothing to wait for, so the page loads faster and simpler.

We also remove a safety net that existed only because writing sample items could fail. That net cleared your browser's cookie when writing failed. It is no longer needed.

**The reset button stays.** It still clears a room and gives you a fresh one. Later, that same button will become "show me examples".

---

## Step 5 — Build the empty-room screen

With no sample items, a visitor sees an empty screen. That is a weak first impression, so we fix it.

The empty screen gets three short steps ending in "add your first item". Nothing long. People who arrive from your landing page want to see the product work, not read a manual.

We also decide what "empty" means in one place, so two screens cannot disagree.

**One choice for you.** Should this screen have a "show me examples" button now, or later?

- **Later, as its own step.** Cleaner and safer. The button needs a setting from the server, which means changing the agreement between the two parts of the app. Doing that inside a screen change mixes two jobs.
- **Now.** Visitors can see examples immediately. But it needs that server setting first, so this step gets bigger.

I recommend later.

---

## Step 6 — Update the notes

Your written notes say the system fills new rooms with sample items and waits for it. That is no longer true. We correct it.

We also fix the old investigation report about the delete button. Part of it is out of date. It blames something that was already fixed weeks ago. We mark the report as solved and remove that stale part, so nobody wastes time on it later.

---

## Step 7 — Interactive & skippable tutorial

Instead of a wall of static onboarding text, the first-run empty room has an interactive 3-step walkthrough:
1. **Interactive item previews**: Visitors click preset examples (Passport, Car Insurance, Netflix, Domain) and see a live simulation of how renewal dates and status badges work.
2. **Dynamic status explanation**: Interactive toggles explain how Active, Expiring Soon, and Expired compute automatically.
3. **Actionable finish**: Clear options to load 4 sample items or create their first custom item.
4. **Skippable at any time**: Visitors can click "Skip tutorial" anytime to reveal a clean workspace, with the dismissal remembered in their session.

---

## Step 8 — High-visibility early access waitlist

The email list / Tally waitlist is now easily reachable, navigable, and pushed gently to users:
- **Banner pill**: Added a prominent `✨ Get Early Access` button right inside the top demo banner across every screen.
- **Elevated sidebar**: Replaced the muted text link with a dedicated early access card in the desktop sidebar footer.
- **Mobile navigation**: Added 1-tap waitlist access to the mobile bottom tab bar.
- **Landing page**: Elevated `Join Waitlist` to a primary hero action alongside `Start the demo`.
- **Gentle in-app nudge**: A non-intrusive, dismissible milestone card at the end of the item list highlights automated email & SMS alerts.

---

## Step 9 — Calendar display fix & category suggestions

- **Calendar popover**: Fixed the collapsed `react-day-picker` styling where day names and dates squished together. Added fixed container sizing and cell widths so days are legible and easy to tap.
- **Category chips**: Added quick-pick category suggestion pills (Documents, Subscriptions, Insurance, Software, Warranties, Health) directly below the category input to speed up item creation.

---

## What you need to do

1. **Confirm nothing important is uncommitted.** Before step 0, we make a change to almost every file. If you have work in progress, commit or set it aside first. Tell me and we stop.
2. **Answer the one question in step 5.** Examples button now or later.
3. **Push to `main` after step 1.** That is when the delete button starts working for real visitors. Everything after that can be reviewed at your pace.

---

## The honest risks

- **Step 0 touches nearly every file once.** It is normal. It is one commit and never repeats.
- **Step 1 depends on settings you cannot see from here.** If the pipeline still does not publish after this change, the cause is on the hosting side, not in your code.
- **Removing sample data makes the first screen emptier.** The tutorial in step 5 is what pays that cost back. Do step 4 and step 5 together, not far apart.
- **Nobody has measured how much Neon usage the sample data actually used.** We believe it is significant. After the change, the numbers will tell us. Worth checking before and after so you know the answer.