# Mahara demo guide (3–5 minutes)

## Before you go on stage

1. Open your Replit URL **5 minutes early** and leave the tab open, so the server is awake.
2. Nothing needs connecting: Mahara scores everything with its own engine. **If you added an `ANTHROPIC_API_KEY`**, open `/api/health` and check it says `"mode":"claude"`. Then grading takes about 20–60 seconds instead of instant, so open **Omar Khalil**'s report while you wait.
3. If you rehearsed and want the original demo data back, open **Shell** in Replit and run `npm run reset-demo`, then refresh the browser.
4. Use the laptop at full width. Practise typing the short answers below. **Paste is switched off in the test on purpose**, so you have to type.

---

## 0:00–0:30 — Introduction

**Show:** the start page ("See what every applicant can do before you read a CV.").

**Say:** "Entry-level CVs in Jordan all look the same. Mahara replaces the CV screen with a 10-minute work sample: real work for the role, two questions about their own answer, and a level with the reason for every score. In Arabic or English."

**Click:** in the chat card on the right, click **Score reply C**, then **Score reply B**. The level goes from Emerging to Strong, the skill bars change, and the highlighted quote is the evidence. **Say:** "Same customer, three applicants. You can see exactly why one is Strong." (These are pre-scored sample replies, and the card says so. Live scoring happens in the real test below.)

## 0:30–1:30 — First interaction: invite an applicant

1. Click **Open employer workspace**.
2. **Say:** "This is the employer's workspace. Three applicants have already been through it."
3. In **Invite an applicant**, type a name (for example `Rania Saleh`) and an email (`rania.saleh@example.com`). Click **Invite applicant**.
4. The confirmation appears with the mascot's thumbs-up. **Say:** "No email needed: the applicant sits at our office device."
5. Click **Start test** in that confirmation.

## 1:30–2:30 — Core product: the applicant does real work

1. Click **English** (or **العربية** to show Arabic), tick the consent box, and click **Start the task**.
2. **Say:** "Every applicant gets the same real situation, with one fact planted in it: here the courier already tried to deliver. Paste is off and tab switches are recorded."
3. In **Reply to the customer**, type (short is fine):
   > Sorry for the delay. Our driver tried to deliver on 4 October at 11:40 but couldn't reach you. I've booked a new delivery for tomorrow between 4 and 7 pm.
4. In **Internal note to logistics**, type:
   > Failed delivery 4 Oct, customer unreachable. Depot team please confirm tomorrow's slot.
5. Click **Submit**, then **Yes, submit**.

## 2:30–3:30 — Key value: two questions only the author can answer

1. Two questions appear, 60 seconds each. **Say:** "They have to explain their own choices. Someone who copied an answer can't defend it."
2. Type one line for each, for example:
   > I gave a time window the driver can keep, and mentioned the missed call so she knows it isn't lost.
   > If the courier never tried, it's our mistake, so I'd apologise directly and offer free delivery.
3. Click **Next question**, then **Finish**. You'll see **You're done** with the mascot cheering.

## 3:30–5:00 — Final feature: the result

1. In the top bar, click **Employer**, then the **Results** tab.
2. Your applicant appears in the list straight away, sorted by level.
3. Open the result. **Show:** the level badge, **Scores by skill** with a reason for each, ownership, time used, tab switches and blocked pastes.
4. Click the **Work** tab. **Say:** "Every score points to the exact words in their answer."
5. Click **Shortlist**.
6. Go back to **All results**. Set **Minimum level → Strong** to filter. If your applicant worked in Arabic, set **Task language → Arabic** to show their result alone.
7. Click **عربي** in the top bar. The whole product flips to Arabic, right to left. **Close with:** "Same rubric, same fairness, in the language the applicant chose."

---

## Backup demo path

Use this if anything goes wrong live (slow Wi-Fi or a typing mistake):

- **No internet at the venue:** it doesn't matter for scoring. Mahara grades on its own server, with no outside service involved.
- **You don't want to type live:** skip the test. Open **Results** and walk through the ready-made reports:
  - **Omar Khalil**: Strong, English, shortlisted.
  - **Lina Haddad**: Job-ready. Use her to show the gap: "polite but generic".
  - **Yazan Odeh**: Emerging. He blamed the courier, and a reviewer left a "Disagree with score" note.
- **Need a fresh test quickly:** on **Invites**, fill in any name and email, click **Invite applicant**, then **Start test**.
- **Page looks stuck:** refresh. Every page has its own address and comes back to the same step, including the middle of a test (answers autosave every 10 seconds).
- **Everything is a mess after rehearsal:** in the Replit **Shell**, run `npm run reset-demo` and refresh.
