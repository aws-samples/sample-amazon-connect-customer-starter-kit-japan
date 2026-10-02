# Rescue — worked solutions

Answers for the two exercises that follow the guided tour. Read the section you're
stuck on, not the whole file: each one is written as a diff against the code as it
ships, in the order that keeps the app compiling after every step.

If you only need a nudge, the "Where each piece goes" table at the top of each
section is the nudge. The code below it is the rescue.

Nothing here is the only correct answer. Where a choice was arbitrary it says so.
Both tracks were applied to a copy of this repo and checked with `npm run
typecheck` and `vite build`, so the snippets compile as written — but they are
written to be understood, not pasted blind.

---

## Track 1 — `reset_claim`

**Goal.** The customer, mid-form, says "actually, scrap that, let's start over."
The four fields clear, the policy stays, and the same thing happens if they click
a button instead.

### Where each piece goes

| Seam | What it needs |
| --- | --- |
| `actions.ts` | `resetClaimAction` — one export, no schema |
| `main.tsx` | `resetDraft`, next to `updateDraft`, passed down as `onReset` |
| `ClaimForm.tsx` | The prop, the action in the declaration, and a **Start over** button |
| ACXD | **Nothing.** See below. |

### Why ACXD needs no change

This is the point of the exercise, and it's worth stopping on. A scope tag is a
request to the Live Sync node — `"survey"` does nothing until a node is scoped to
it. A **custom action** is not: it is declared by the page at runtime through
`sendContext`, and the assistant is told about it on the spot. `reset_claim` lands
under the `claim_details` scope that already exists, so the node you already have
picks it up the moment the claim form mounts.

That asymmetry is the whole reason declaring actions client-side makes iteration
fast, and it's why Track 2 needs an ACXD change and this one doesn't.

### 1. `src/actions.ts`

Add after `submitClaimAction`:

```ts
/**
 * Clear the form and start the claim over on the same policy — the same path the
 * Start over button takes.
 */
export const resetClaimAction = (
  reset: () => void,
): LiveSyncCustomAction => ({
  action: "reset_claim",
  description:
    "Clear every answer on the claim form and start over, keeping the same policy. Use this when the customer says they want to start again, that what they told you was wrong, or that they were describing a different incident. After calling it the form is blank: read it back as blank, and do not re-send the values you had before unless the customer says them again. If they picked the wrong policy, use change_policy instead — that keeps them out of a form they don't want.",
  schema: { type: "object", properties: {} },
  handler: () => {
    reset();
  },
});
```

Two things in that description are doing real work, and both come from watching
this fail:

- **"do not re-send the values you had before."** Without it the model treats the
  reset as a UI hiccup and helpfully re-fills the form from the transcript. The
  customer watches everything they just cleared reappear.
- **"use `change_policy` instead."** Two actions that both sound like "start
  again" will get confused for each other. Say which is which, in the
  descriptions, or the model guesses.

Descriptions are prompt, not documentation. Write them for the model.

### 2. `src/main.tsx`

Next to `updateDraft`:

```ts
const resetDraft = useCallback((): void => {
  setDraft(emptyDraft);
  setShowErrors(false);
  setSubmitError(null);
}, []);
```

Clearing `showErrors` matters. Reset from a refused submit and, without it, the
customer gets a blank form pre-decorated with four errors about fields they
haven't filled in yet — the same reason the `selectedPolicyId` effect below it
already resets those two.

`setResult(null)` is deliberately *not* here: a reset on the form has nothing to
do with a claim that was already filed.

Then pass it down:

```tsx
{step === "claim" && selectedPolicy != null ? (
  <ClaimForm
    policy={selectedPolicy}
    draft={draft}
    errors={showErrors ? errors : {}}
    submitting={submitting}
    submitError={submitError}
    onChange={updateDraft}
    onSubmit={submit}
    onReset={resetDraft}
  />
) : null}
```

### 3. `src/screens/ClaimForm.tsx`

Imports:

```tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
  type FormEvent,
} from "react";
import {
  changePolicyAction,
  fillClaimAction,
  resetClaimAction,
  submitClaimAction,
} from "../actions";
```

Props:

```tsx
interface ClaimFormProps {
  policy: Policy;
  draft: ClaimDraft;
  errors: ClaimErrors;
  submitting: boolean;
  submitError: string | null;
  onChange: (patch: Partial<ClaimDraft>) => void;
  onSubmit: () => void;
  onReset: () => void;
}
```

Then replace the `useLiveSyncContext` call with this:

```tsx
  // A reset is silent if you can see the form and invisible if you can't, so it
  // gets announced. Both the button and the action come through here, which is
  // what keeps a click and a spoken request indistinguishable.
  const [justCleared, setJustCleared] = useState(false);

  const handleReset = useCallback((): void => {
    onReset();
    setJustCleared(true);
  }, [onReset]);

  useEffect(() => {
    if (!justCleared) {
      return;
    }
    const timer = window.setTimeout(() => setJustCleared(false), 4000);
    return () => window.clearTimeout(timer);
  }, [justCleared]);

  // Filling, submitting and resetting all go through the same callbacks the
  // controls use, validation included; changing policy is the link at the top.
  // The scopes for this step go with them, in the same call.
  const actions = useMemo(
    () => [
      fillClaimAction(policy, onChange),
      submitClaimAction(onSubmit),
      resetClaimAction(handleReset),
      changePolicyAction(() => navigate(paths.policies)),
    ],
    [policy, onChange, onSubmit, handleReset],
  );

  useLiveSyncContext("claim", actions);
```

**This is also the `useMemo` fix the README nags about.** `ClaimForm` imports
`useMemo` and doesn't use it, so the array passed to `useLiveSyncContext` is a new
array on every render, the effect's `[step, actions]` dependency changes every
time, and the whole context is re-sent on every keystroke. Wrap it and the
declaration goes out once per policy instead. Do the same in `PolicyPicker.tsx`
and `Confirmation.tsx` while you're here; the honest dependency lists are
`[policies]` and `[]`. (`PolicyPicker`'s call may still be commented out from the
earlier `select_policy` exercise — uncomment it first, then memoise it.)

The button, in the `actionRow` beside Submit and Cancel:

```tsx
<div className={actionRow}>
  <button
    type="submit"
    className={`btn btn-primary ${blockOnMobile}`}
    disabled={submitting}
  >
    {submitting ? (
      <>
        <SpinnerIcon className="size-4 shrink-0" />
        Submitting…
      </>
    ) : (
      "Submit claim"
    )}
  </button>
  <button
    type="button"
    className={`btn btn-quiet ${blockOnMobile}`}
    onClick={handleReset}
    disabled={submitting}
  >
    Start over
  </button>
  <a className={`btn btn-quiet ${blockOnMobile}`} href={paths.policies}>
    Cancel
  </a>
</div>
```

`type="button"` is not optional — the default inside a `<form>` is `submit`, and a
Start over button that files the claim is a memorable bug.

And fold the announcement into the status region that's already there:

```tsx
<p className="sr-only" role="status">
  {submitting
    ? "Submitting your claim…"
    : justCleared
      ? "The claim form has been cleared."
      : ""}
</p>
```

### 4. Keep the docs honest

The README's step table is the map people read first. Add the action to it:

```
| Details | `screens/ClaimForm.tsx` | `fnol`, `claim_details` | `fill_claim_details`, `submit_claim`, `reset_claim`, `change_policy` |
```

### Done when

- `npm run typecheck` is clean.
- **Say it, then click it.** Fill two fields, ask the assistant to start over,
  watch them clear. Fill two more, click Start over, watch the same thing.
- The assistant doesn't re-fill the form from memory in the turn after a reset.
  If it does, that's the description, not the code.
- Submit an empty form, then reset: no leftover error summary.
- Ask for a reset while on the policy list. Nothing happens, because
  `reset_claim` isn't declared there — that's scoping working, not a bug.

---

## Track 2 — the post-claim survey

**Goal.** After the claim is filed, the assistant asks how it went, the page
reflects the answers as they land, and the result is POSTed somewhere.

This inverts the conversation. On the claim form the customer volunteers and the
form follows; here the assistant asks and the page keeps up. Same mechanism,
opposite initiative — which is the first point where the shape of your ACXD prompt
matters as much as the shape of your schema.

### Where each piece goes

| Seam | What it needs |
| --- | --- |
| **ACXD** | A node scoped to `survey`, with the questions in its prompt. **Do this first.** |
| `touchpoint.ts` | `"survey"` on `Step`, its tags in `scopesForStep` |
| `router.ts` | `#/survey` on `Route`, `paths`, and `parseRoute` |
| `survey.ts` *(new)* | The answers, their validation, and the request body |
| `api.ts` | `submitSurvey` — the third call |
| `actions.ts` | `answer_survey`, `submit_survey`, `skip_survey`, `start_survey` |
| `main.tsx` | The answers, a guard, the clear-on-return, a `steps` entry, `hrefForStep` |
| `screens/Survey.tsx` *(new)* | The page, with its context call at the top |
| `Confirmation.tsx` | A link to the survey, and the action that follows it |

Build it in that order and the app compiles and runs after every step. In
particular, do `touchpoint.ts` and `router.ts` and the page **before** any action:
you want to watch the scope change land while there is still nothing to dispatch,
so that when something breaks later you know it isn't the plumbing.

### 0. ACXD first

A scope tag is a request, not an instruction. Ship the app with `["fnol",
"survey"]` and no node scoped to `survey`, and everything will look right — the
page renders, the context sends, the socket is up — and the assistant will sit
there in silence. That is a bad hour, and it is entirely avoidable.

Add a Live Sync node scoped to `survey` with a prompt along these lines:

> The customer has just filed a claim and is now on a short feedback form. Ask
> them three things, one at a time, in this order.
>
> 1. How satisfied they were with filing the claim, on a scale of 1 to 5 where 5
>    is best. Ask it as a question, not as a list — do not read the five labels
>    out.
> 2. Whether their issue was resolved. Yes or no.
> 3. Whether there is anything else they'd like to add. This one is optional; if
>    they have nothing, move on.
>
> Call `answer_survey` the moment each answer lands, one call per answer, before
> you ask the next question — the customer is watching the form fill in as they
> talk. Never batch two answers into one call.
>
> When all three are done, read the answers back, and call `submit_survey` once
> they confirm.
>
> If they don't want to answer, do not push. Call `skip_survey` with the closest
> reason and thank them. Someone who has just had an accident is allowed to be
> done talking.
>
> You can see the claim reference on the page. Use it when you thank them.

That last line is not decoration. The claim number reaches the assistant because
it is *rendered on the page* and `automaticContext` inspects the DOM — there is no
`get_claim_details` action to write, and there can't be, because `handler` returns
`void`. Actions are how the assistant writes to the page. The page is how it
reads.

### 1. `src/touchpoint.ts`

```ts
/** Which step of the flow the customer is on. */
export type Step = "policies" | "claim" | "submitted" | "survey";

/** The scope tags for each step, sent with that step's actions. */
const scopesForStep = (step: Step): string[] => {
  if (step === "policies") {
    return ["fnol", "policy_selection"];
  }
  if (step === "claim") {
    return ["fnol", "claim_details"];
  }
  if (step === "survey") {
    return ["fnol", "survey"];
  }
  return ["fnol", "claim_submitted"];
};
```

### 2. `src/router.ts`

```ts
export type Route =
  | { name: "policies" }
  | { name: "claim"; policyId: string }
  | { name: "confirmation" }
  | { name: "survey" };

export const paths = {
  policies: "#/policies",
  claim: (policyId: string): string =>
    `#/claim/${encodeURIComponent(policyId)}`,
  confirmation: "#/confirmation",
  survey: "#/survey",
} as const;
```

And in `parseRoute`, beside the `confirmation` branch:

```ts
  if (first === "survey") {
    return { name: "survey" };
  }
```

The file's header comment says "The three steps of the claim". It's four now.
Fix it — the comments in this repo are the documentation, and a stale one costs
the next reader more than a missing one.

### 3. `src/survey.ts` (new)

Mirrors `claim.ts`: the contract, what counts as answered, and how the typed-in
strings become a request body.

```ts
import type { ClaimRequest, ClaimResponse } from "./claim";

/**
 * The post-claim survey: what the page holds while it is being answered, and the
 * body that gets POSTed.
 *
 * Everything in the draft is a string because that is what radios and textareas
 * produce; the conversion happens once, in {@link toSurveyRequest}. Same shape as
 * `ClaimDraft` for the same reason — a spoken answer and a click land in the same
 * place.
 */

/* The form ------------------------------------------------------------------ */

export interface SurveyDraft {
  /** "1" through "5", or "" while unanswered. */
  satisfaction: string;
  /** "yes", "no", or "" while unanswered. */
  resolved: string;
  /** Free text. Optional. */
  comments: string;
}

export const emptySurvey: SurveyDraft = {
  satisfaction: "",
  resolved: "",
  comments: "",
};

/**
 * The 1–5 scale. The labels are for the radios on the page; the assistant is told
 * to ask for a number rather than read these out, so they are never spoken.
 */
export const satisfactionScale: Array<{ value: string; label: string }> = [
  { value: "1", label: "Very poor" },
  { value: "2", label: "Poor" },
  { value: "3", label: "OK" },
  { value: "4", label: "Good" },
  { value: "5", label: "Very good" },
];

export const resolvedOptions: Array<{ value: string; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export type SurveyErrors = Partial<Record<keyof SurveyDraft, string>>;

/** The two required answers. `comments` is optional and never errors. */
export const validateSurvey = (draft: SurveyDraft): SurveyErrors => {
  const errors: SurveyErrors = {};

  if (draft.satisfaction === "") {
    errors.satisfaction = "Choose a rating from 1 to 5.";
  }

  if (draft.resolved === "") {
    errors.resolved = "Let us know whether your issue was resolved.";
  }

  return errors;
};

/* The API contract ---------------------------------------------------------- */

/**
 * The survey payload. Keyed to the claim it is about, so the answers can be found
 * again — `claimId` when the claims service gave us one, `policyId` regardless.
 *
 * A skip is a survey result too: knowing that half of your customers decline is
 * worth more than a gap in the data.
 */
export interface SurveyRequest {
  claimId?: string;
  customerId: string;
  policyId: string;
  skipped: boolean;
  skipReason?: string;
  satisfaction?: number;
  resolved?: boolean;
  comments?: string;
}

/** Which claim the answers are about. `customerId` comes from the filed claim. */
const claimKeys = (
  claim: ClaimRequest,
  response: ClaimResponse,
): Pick<SurveyRequest, "claimId" | "customerId" | "policyId"> => ({
  ...(response.claimId != null ? { claimId: response.claimId } : {}),
  customerId: claim.customerId,
  policyId: claim.policyId,
});

export const toSurveyRequest = (
  draft: SurveyDraft,
  claim: ClaimRequest,
  response: ClaimResponse,
): SurveyRequest => ({
  ...claimKeys(claim, response),
  skipped: false,
  satisfaction: Number(draft.satisfaction),
  resolved: draft.resolved === "yes",
  ...(draft.comments.trim() === "" ? {} : { comments: draft.comments.trim() }),
});

export const toSkippedSurveyRequest = (
  reason: string | undefined,
  claim: ClaimRequest,
  response: ClaimResponse,
): SurveyRequest => ({
  ...claimKeys(claim, response),
  skipped: true,
  ...(reason == null || reason === "" ? {} : { skipReason: reason }),
});
```

### 4. `src/api.ts`

```ts
import type { SurveyRequest } from "./survey";

/**
 * Where the survey goes. Defaults to `/surveys` on the same stage as the other
 * two calls; set `VITE_SURVEY_PATH` if your route is named something else.
 */
const surveyPath: string =
  String(import.meta.env.VITE_SURVEY_PATH ?? "").trim() || "/surveys";

/** `POST {VITE_API_BASE_URL}{surveyPath}` with the answers, or with a skip. */
export const submitSurvey = async (survey: SurveyRequest): Promise<void> => {
  const response = await fetch(`${baseUrl}${surveyPath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(survey),
  });
  if (!response.ok) {
    throw await failure(response, "Submitting the survey");
  }
};
```

Update the file's header comment too — it says "The two calls this app makes".

**On the endpoint itself.** Anything that accepts a JSON POST and checks
`x-api-key` will do; an API Gateway route on the stage you're already using,
wired to a Lambda that writes to DynamoDB, is the least work. Two notes:

- **Give it a defaulted path, not a required key.** `VITE_SURVEY_PATH` is optional
  here on purpose. Making it required means three edits in lockstep —
  `.env.example`, `requiredSettings` in `main.tsx`, and the README's variable
  table — and a setup gate that blocks the whole app over a survey. If your survey
  lives on a different stage entirely, then yes, add `VITE_SURVEY_ENDPOINT` as a
  required setting and do all three.
- **Let it fail loudly.** `failure()` already puts the status and the body into
  the error, which is how you tell a 403 (key) from a 404 (path) from a 502
  (handler) without opening the network tab.

### 5. `src/actions.ts`

```ts
import { emptySurvey, satisfactionScale, type SurveyDraft } from "./survey";

/**
 * Record an answer the customer has just given. Modelled on
 * {@link fillClaimAction}: one action taking a partial patch, called once per
 * answer, rather than one action per question.
 */
export const answerSurveyAction = (
  answer: (patch: Partial<SurveyDraft>) => void,
): LiveSyncCustomAction => ({
  action: "answer_survey",
  description:
    "Record an answer to the feedback survey. Call this the moment you have one answer — one field per call, before you ask the next question. Do not wait to send two together, and call it again if the customer changes an answer. The customer is watching the form fill in as they talk, so a late call reads as not having been heard.",
  schema: {
    type: "object",
    properties: {
      satisfaction: {
        type: "string",
        description:
          "How satisfied the customer was filing the claim, 1 to 5, where 5 is best. Send the number they gave; if they answered in words ('pretty good'), map it yourself rather than asking them to pick a number.",
        enum: satisfactionScale.map((step) => step.value),
      },
      resolved: {
        type: "string",
        description: "Whether the customer's issue was resolved.",
        enum: ["yes", "no"],
      },
      comments: {
        type: "string",
        description:
          "Anything else the customer wanted to add, in their own words. Optional — omit it if they had nothing.",
      },
    },
  },
  handler: (value: Partial<Record<keyof SurveyDraft, string | number>>) => {
    const patch: Partial<SurveyDraft> = {};
    for (const field of Object.keys(emptySurvey) as Array<keyof SurveyDraft>) {
      const next = value[field];
      if (next != null && next !== "") {
        patch[field] = String(next);
      }
    }
    answer(patch);
  },
});

/** Send the answers — the same path the submit button takes, validation included. */
export const submitSurveyAction = (
  submit: () => void,
): LiveSyncCustomAction => ({
  action: "submit_survey",
  description:
    "Submit the survey. Only after reading the answers back and getting the customer's confirmation.",
  schema: { type: "object", properties: {} },
  handler: () => {
    submit();
  },
});

/** Let the customer out of the survey, and record why. */
export const skipSurveyAction = (
  skip: (reason?: string) => void,
): LiveSyncCustomAction => ({
  action: "skip_survey",
  description:
    "Skip the survey when the customer does not want to answer. Do not talk them into it — they have just had an accident. Pick the reason closest to what they said.",
  schema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Why the customer declined, as closely as you can tell.",
        enum: ["too_busy", "not_interested", "already_gave_feedback", "other"],
      },
    },
  },
  handler: ({ reason }: { reason?: string }) => {
    skip(reason);
  },
});

/** Take the customer from the confirmation to the survey. */
export const startSurveyAction = (
  startSurvey: () => void,
): LiveSyncCustomAction => ({
  action: "start_survey",
  description:
    "Open the short feedback survey. Use this once the customer has agreed to answer a few questions about how filing the claim went.",
  schema: { type: "object", properties: {} },
  handler: () => {
    startSurvey();
  },
});
```

`answerSurveyAction`'s handler loops over `emptySurvey`'s keys rather than
checking three fields by name, which means adding a fourth question is one entry
in `SurveyDraft` and one property in the schema. `fillClaimAction` spells its four
out because `incidentDate` and `amount` each need their own coercion; nothing here
does.

### 6. `src/main.tsx`

State, beside the claim's:

```ts
const [survey, setSurvey] = useState<SurveyDraft>(emptySurvey);
const [surveyShowErrors, setSurveyShowErrors] = useState(false);
const [surveySubmitting, setSurveySubmitting] = useState(false);
const [surveyError, setSurveyError] = useState<string | null>(null);
const [surveyState, setSurveyState] = useState<"open" | "sent" | "skipped">(
  "open",
);
```

Errors, beside the claim's:

```ts
const surveyErrors: SurveyErrors = useMemo(
  () => validateSurvey(survey),
  [survey],
);
```

The handlers read state from outside React, so they go through the existing ref.
Extend it:

```ts
const latest = useRef({ selectedPolicy, draft, survey, result });
latest.current = { selectedPolicy, draft, survey, result };
```

```ts
const updateSurvey = useCallback((patch: Partial<SurveyDraft>): void => {
  setSurvey((previous) => ({ ...previous, ...patch }));
}, []);

const runSubmitSurvey = useCallback(async (): Promise<void> => {
  const { survey: current, result: filed } = latest.current;
  if (filed == null) {
    return;
  }
  if (Object.keys(validateSurvey(current)).length > 0) {
    setSurveyShowErrors(true);
    return;
  }

  setSurveySubmitting(true);
  setSurveyError(null);
  try {
    await submitSurvey(toSurveyRequest(current, filed.claim, filed.response));
    setSurveyState("sent");
  } catch (error) {
    setSurveyError(describe(error));
  } finally {
    setSurveySubmitting(false);
  }
}, []);

const sendSurvey = useCallback((): void => {
  void runSubmitSurvey();
}, [runSubmitSurvey]);

const skipSurvey = useCallback((reason?: string): void => {
  const { result: filed } = latest.current;
  setSurveyError(null);
  setSurveyState("skipped");
  if (filed != null) {
    // A skip that doesn't reach the API is not worth showing the customer an
    // error about — they already said they were done.
    void submitSurvey(
      toSkippedSurveyRequest(reason, filed.claim, filed.response),
    ).catch(() => {});
  }
}, []);
```

The guard, in the effect that already holds the other two:

```ts
if (route.name === "survey" && result == null) {
  redirect(paths.policies);
}
```

**Why this doesn't loop, and how it could.** `redirect` dispatches `hashchange`,
`useRoute` sets a fresh `route` object, and the guard effect — which depends on
`route` — runs again. So the rule is: **a guard must redirect somewhere whose own
guards pass.** `#/policies` has none, so this settles in one hop. Redirect
`#/survey` to `#/confirmation` instead and you have built a loop, because
`result == null` fails that guard too and it sends you back. The README's warning
about pasting the `#/confirmation` guard is this, and it is the one mistake here
that hangs the tab rather than showing you a stack trace.

Clearing on return, in the effect that already does it for the claim:

```ts
if (route.name === "policies" && result != null) {
  setDraft(emptyDraft);
  setShowErrors(false);
  setSubmitError(null);
  setResult(null);
  setSurvey(emptySurvey);
  setSurveyShowErrors(false);
  setSurveyError(null);
  setSurveyState("open");
}
```

That is what makes "file a second claim, get an empty survey" true, and it works
for every route back to the start — the link, the progress nav, the back button,
or the assistant — because it keys off arriving rather than off a click.

The progress nav:

```ts
const steps: Array<{ id: Step; label: string }> = [
  { id: "policies", label: "Policy" },
  { id: "claim", label: "Details" },
  { id: "submitted", label: "Done" },
  { id: "survey", label: "Feedback" },
];
```

```ts
if (entry.id === "submitted") {
  return result != null ? paths.confirmation : null;
}
return result != null ? paths.survey : null;
```

Check that at 360px before you commit it. Four labels plus connectors is close to
the limit the three-step version was designed around; "Feedback" is the longest
word in the row. Shortening it, or leaving the survey out of the nav entirely and
reaching it only from the confirmation, are both defensible — the survey is
optional, and a progress indicator that counts an optional step is arguably lying.

And the render, beside the other three:

```tsx
{step === "survey" && result != null ? (
  <Survey
    claim={result.claim}
    response={result.response}
    draft={survey}
    errors={surveyShowErrors ? surveyErrors : {}}
    submitting={surveySubmitting}
    submitError={surveyError}
    state={surveyState}
    onChange={updateSurvey}
    onSubmit={sendSurvey}
    onSkip={skipSurvey}
  />
) : null}
```

`step` needs no change. It reads `route.name === "confirmation" ? "submitted" :
route.name`, and `"survey"` is now a member of both types, so it passes straight
through.

### 7. `src/screens/Survey.tsx` (new)

```tsx
import { useCallback, useMemo, type ChangeEvent, type FC } from "react";
import {
  answerSurveyAction,
  skipSurveyAction,
  submitSurveyAction,
} from "../actions";
import type { ClaimRequest, ClaimResponse } from "../claim";
import {
  resolvedOptions,
  satisfactionScale,
  type SurveyDraft,
  type SurveyErrors,
} from "../survey";
import { AlertIcon, CheckIcon, SpinnerIcon } from "../icons";
import { focusFragment, paths } from "../router";
import { useLiveSyncContext } from "../touchpoint";
import { actionRow, alertBox, blockOnMobile, heading2, lead } from "./shared";

/**
 * Step 4: how it went. Two required answers and an optional one.
 *
 * Live Sync context for this step is declared at the top of the component: scope
 * tags `fnol` / `survey`, and `answer_survey`, `submit_survey`, `skip_survey`.
 * Holds no state — `main.tsx` owns the answers, so a click and a spoken answer
 * take the same path.
 *
 * The claim reference stays rendered here on purpose: that is how the assistant
 * knows it, since `automaticContext` inspects the DOM and no action can return a
 * value.
 */

interface SurveyProps {
  claim: ClaimRequest;
  response: ClaimResponse;
  draft: SurveyDraft;
  errors: SurveyErrors;
  submitting: boolean;
  submitError: string | null;
  state: "open" | "sent" | "skipped";
  onChange: (patch: Partial<SurveyDraft>) => void;
  onSubmit: () => void;
  onSkip: (reason?: string) => void;
}

/** Field order for the error summary, and where each error links to. */
const fieldOrder: Array<{ field: keyof SurveyDraft; anchor: string }> = [
  { field: "satisfaction", anchor: "satisfaction" },
  { field: "resolved", anchor: "resolved" },
];

const FieldError: FC<{ id: string; children: string }> = ({ id, children }) => (
  <p className="field-error" id={id}>
    <AlertIcon className="mt-px size-3.5 shrink-0" />
    {children}
  </p>
);

/**
 * A radio group as a `fieldset`/`legend`, with the error hanging off the fieldset
 * — the same markup as the claim-type group in `ClaimForm.tsx`, for the same
 * reason: that is what page inspection and screen readers both read.
 *
 * The first input in each group carries the bare field name as its `id` so the
 * error summary has something to link to.
 */
const RadioGroup: FC<{
  field: keyof SurveyDraft;
  legend: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}> = ({ field, legend, options, value, error, onChange }) => (
  <fieldset
    className="min-w-0"
    aria-describedby={error != null ? `${field}-error` : undefined}
    aria-invalid={error != null}
  >
    <legend className="field-label mb-2">{legend}</legend>
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((option, index) => {
        const id = index === 0 ? field : `${field}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface p-3.5 transition-colors duration-150 hover:border-line-strong hover:bg-canvas has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
          >
            <input
              id={id}
              type="radio"
              name={field}
              value={option.value}
              required
              checked={value === option.value}
              onChange={onChange}
              className="size-4 shrink-0 accent-accent"
            />
            <span className="min-w-0 text-[0.9375rem] font-semibold text-ink">
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
    {error != null ? (
      <div className="mt-2">
        <FieldError id={`${field}-error`}>{error}</FieldError>
      </div>
    ) : null}
  </fieldset>
);

export const Survey: FC<SurveyProps> = ({
  claim,
  response,
  draft,
  errors,
  submitting,
  submitError,
  state,
  onChange,
  onSubmit,
  onSkip,
}) => {
  const skip = useCallback((reason?: string): void => onSkip(reason), [onSkip]);

  const actions = useMemo(
    () => [
      answerSurveyAction(onChange),
      submitSurveyAction(onSubmit),
      skipSurveyAction(skip),
    ],
    [onChange, onSubmit, skip],
  );

  useLiveSyncContext("survey", actions);

  const listed = fieldOrder.filter(({ field }) => errors[field] != null);

  const setField =
    (field: keyof SurveyDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      onChange({ [field]: event.target.value });
    };

  if (state !== "open") {
    return (
      <section aria-labelledby="survey-done-heading">
        <div className="flex items-center gap-3 sm:gap-4">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"
            aria-hidden="true"
          >
            <CheckIcon className="size-6" />
          </span>
          <h2 id="survey-done-heading" className={heading2}>
            {state === "sent" ? "Thank you" : "No problem"}
          </h2>
        </div>
        <p className={lead}>
          {state === "sent"
            ? "Your feedback helps us make filing a claim less of a chore."
            : "Your claim is filed either way — nothing else is needed from you."}
        </p>
        <div className={`${actionRow} mt-6`}>
          <a
            className={`btn btn-quiet ${blockOnMobile}`}
            href={paths.policies}
          >
            Back to my policies
          </a>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="survey-heading">
      <h2 id="survey-heading" className={heading2}>
        How did that go?
      </h2>
      <p className={lead}>
        Two quick questions about filing claim{" "}
        <strong className="font-mono font-semibold text-ink">
          {response.claimId ?? claim.policyId}
        </strong>
        . You can skip this.
      </p>

      <form
        className="mt-6 grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        {listed.length > 0 ? (
          <div className={alertBox} role="alert">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {listed.map(({ field, anchor }) => (
                <li key={field}>
                  <a
                    href={`#${anchor}`}
                    onClick={focusFragment}
                    className="underline decoration-danger/40 underline-offset-4 hover:decoration-danger"
                  >
                    {errors[field]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <RadioGroup
          field="satisfaction"
          legend="How was filing this claim? 1 is very poor, 5 is very good."
          options={satisfactionScale}
          value={draft.satisfaction}
          error={errors.satisfaction}
          onChange={setField("satisfaction")}
        />

        <RadioGroup
          field="resolved"
          legend="Was your issue resolved?"
          options={resolvedOptions}
          value={draft.resolved}
          error={errors.resolved}
          onChange={setField("resolved")}
        />

        <div className="grid min-w-0 gap-1.5">
          <label className="field-label" htmlFor="comments">
            Anything else?
          </label>
          <textarea
            className="input resize-y leading-relaxed"
            id="comments"
            name="comments"
            rows={4}
            placeholder="Optional."
            value={draft.comments}
            onChange={setField("comments")}
            aria-describedby="comments-hint"
          />
          <p className="field-hint" id="comments-hint">
            Optional — leave it blank if you'd rather not.
          </p>
        </div>

        {submitError != null ? (
          <div
            className={`${alertBox} flex items-start gap-2 text-sm font-medium`}
            role="alert"
          >
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        ) : null}

        <div className={actionRow}>
          <button
            type="submit"
            className={`btn btn-primary ${blockOnMobile}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <SpinnerIcon className="size-4 shrink-0" />
                Sending…
              </>
            ) : (
              "Send feedback"
            )}
          </button>
          <button
            type="button"
            className={`btn btn-quiet ${blockOnMobile}`}
            onClick={() => onSkip("other")}
            disabled={submitting}
          >
            Skip
          </button>
        </div>

        <p className="sr-only" role="status">
          {submitting ? "Sending your feedback…" : ""}
        </p>
      </form>
    </section>
  );
};
```

### 8. `src/screens/Confirmation.tsx`

Give the confirmation a way forward, as a link and as an action:

```tsx
const actions = useMemo(
  () => [
    startOverAction(() => navigate(paths.policies)),
    startSurveyAction(() => navigate(paths.survey)),
  ],
  [],
);

useLiveSyncContext("submitted", actions);
```

```tsx
<div className={`${actionRow} mt-6`}>
  <a className={`btn btn-primary ${blockOnMobile}`} href={paths.survey}>
    Give feedback
  </a>
  <a className={`btn btn-quiet ${blockOnMobile}`} href={paths.policies}>
    File another claim
  </a>
</div>
```

`startSurveyAction` is a bespoke navigation action, which is the quick way. The
better way, once you've seen it work, is `destinations` on the context: pass
`destinations: ["survey", "my policies"]` and Live Sync's `page_custom` navigation
handles "take me back to my policies" without an action per destination. That is
the last item under "Going further" in the README, and it is a much better use of
twenty minutes than a fifth action.

### 9. Keep the docs honest

Four places in the README go stale the moment this works, and the file tree and
the step table are the two things people read first:

- The step table gains a **Feedback** row: `screens/Survey.tsx`, `fnol` /
  `survey`, `answer_survey` / `submit_survey` / `skip_survey`.
- The **Done** row gains `start_survey`.
- The navigation table gains `#/survey`.
- The file tree gains `survey.ts` and `screens/Survey.tsx` — and "eight files in
  `src/`" in the intro becomes nine.
- `api.ts` is no longer "the two API calls".
- The Exercise section is now a solved exercise. Say so, and point at this file.

### Done when

There is no test suite here, so check it by hand.

- `npm run typecheck` is clean.
- **Every question answers by voice and by clicking, with the same result.** Do
  both, on the same question, in the same session.
- Answers appear one at a time as the customer talks, not in a batch at the end.
  If they batch, the fix is in `answer_survey`'s description, not in the code.
- The assistant refers to the claim number without any action existing to fetch
  it.
- The radio groups are real `fieldset`/`legend` groups, every input with an `id`,
  a `name`, and a label.
- Back out of `#/survey`: it neither strands the customer nor loops.
- File a second claim: the survey is empty, not the last one's answers.
- `skip_survey` reaches the API with a reason. Check the network tab, or your
  table.
- Turn the ACXD node off and the page still works as a plain form. That is not a
  requirement of the design — the app refuses to run without Live Sync keys — but
  it tells you which half is broken when something is.

---

## When it doesn't work

Symptoms, in the order they actually come up.

**The assistant says nothing on the new step.** The scope has no node. Scope tags
are requests. Check ACXD before you check your code.

**The action never fires.** Was it declared? `sendContext` only carries what the
mounted page passed, and an action with no `description` is filtered out before it
is sent — that filtering lives in `sendLiveSyncContext` inside the published
bundle, so you won't find it in this repo. Then check the name
matches on both sides, exactly.

**It fires, but the page doesn't change.** The handler ran against stale state.
Handlers are called from outside React, so anything that reads state reads it
through the `latest` ref in `main.tsx`, not from a closure.

**Context re-sends on every keystroke.** The actions array isn't memoised. New
array, new dependency, effect re-fires. This is the `useMemo` thing.

**The previous step's scopes are still in effect.** Something sent `actions`
without `scopes`. `sendLiveSyncContext` merges per key — omit one and the previous
value stays. Send both in one call, always, which is why
`useLiveSyncContext` takes them together and why nothing else calls
`sendContext`.

**The tab hangs on a route change.** A guard is redirecting to a route whose guard
redirects back. Guards must land somewhere that passes.

**The assistant re-fills a form you just cleared.** Description, not code. Tell it
not to.
