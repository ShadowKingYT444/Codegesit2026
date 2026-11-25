// Prompts. CARD, SELECT and SPEAK are the exact prompts of the engine that scored 96.9% clean turns in the
// frozen blind test (validation/sim, method "app"). Do not edit them without re-running `npm run sim`.
// GRADE_DEFS is the exact error wording of the single-call grader that won the grading test (F1 73.0).
export const SIM_SYS = 'You are a careful simulation engine for training customer support agents. Follow the output format exactly.';

export const CARD = (msgs) => `Build a knowledge card for simulating this customer. You see ONLY what the customer wrote in a past support ticket, in order.
Message 1 is the opening message. List every concrete fact the customer stated in messages 2 and later and that is NOT already in message 1:
copy exact details verbatim (codes, numbers, names, versions, dates, places). For each fact, say what kind of agent question would make the
customer say it. Mark facts that are only the customer's report of trying something the agent suggested as kind "reaction".
Also describe the persona (tone, tech level, patience, writing style).

${msgs}

Return only JSON: {"persona": "...", "opening_summary": "...", "facts": [{"id": "h1", "detail": "exact wording with the exact codes", "asked_by": "what question elicits it", "kind": "fact|reaction"}]}`;

export const SELECT = (facts, msg) => `You run a customer simulation for support training. The customer knows these facts but gives each one only when the trainee's
message asks for it (directly or by asking about the topic it answers), or when the trainee asks the customer to check or try exactly that thing.
Already given facts can be repeated freely.

Facts not yet given:
${facts}

Trainee's new message: "${msg}"

Which not-yet-given facts does this message ask for? Be literal: a general question ("anything else?") does not release specific facts unless
it targets their topic. Also classify the message.
Return only JSON: {"release": ["h1", ...], "kind": "question|fix_proposal|asks_unknowable|small_talk|other"}`;

export const SPEAK = (persona, given, fresh, conv) => `You are role-playing a customer in a support conversation for agent training. Persona: ${persona}
What you know and may say: your opening message, these facts you have already given: ${given}
NEW facts you must now give in this reply, with their exact details (codes, numbers, names copied exactly): ${fresh}
You know nothing else about the cause or the fix. If the trainee asks for something not listed here, say you don't know or haven't checked,
in character. If the trainee proposes a fix or step, react naturally (agree to try it, ask a short question) but do not report a result.
Do not add any other specific details (no other codes, numbers, versions, names). Keep it short and in your own tone.

Conversation so far:
${conv}

Write the customer's next message only.`;


// Step 6 addition (not in the frozen test, measured by `npm run eval:solved`): after a fix proposal, the
// solved check decides the result and the speaker reports it in character. Appended to SPEAK only on fix turns.
export const OUTCOME = {
  solved: 'You tried what the trainee proposed and it WORKED: the problem is gone now. Say so in your own words and thank them. Do not explain why it worked.',
  not_yet: 'You tried what the trainee proposed (or you are about to) and the problem is STILL THERE, exactly as before. Say so briefly. Do not guess why and do not suggest a fix.',
  made_worse: 'You tried what the trainee proposed and things got WORSE (it now fails differently or something else broke). Say so, a bit upset. Do not guess why.',
};
export const SPEAK_WITH_OUTCOME = (speakPrompt, verdict) => `${speakPrompt}\n\nRESULT OF THE STEP THE TRAINEE JUST PROPOSED: ${OUTCOME[verdict]}`;

// ------------------------------------------------------------------ grading (one grounded call)
export const GRADE_SYS = "You are a meticulous support quality reviewer. Follow the output format exactly.";
export const GRADE_DEFS = `Error types:
- wrong_fix: the reply tells the customer to do something, or states a cause/fix, that is wrong for this issue per the KB and the real resolution, or misapplies a KB procedure.
- skipped_required_step: the reply does something (or tells the customer it is done) without a step that a SOP or the KB procedure requires first (e.g. identity check, approval, required form).
- asked_known_info: the reply asks the customer for information the customer has already given in the conversation.
- unauthorized_promise: the reply promises or grants something beyond what the SOPs allow (refund/credit above limit, guaranteed timeline, exception, outcome not in the agent's control).
- missing_needed_question: the reply fails to ask for information that is needed to proceed and has not been given yet (and does not get it another way).
- leaked_internal: the reply reveals internal-only information (internal note content, internal hostnames/tools/system names, other customers' data, internal blame).
- tone: rude, dismissive, blaming, sarcastic, or otherwise against the tone rules.
Clarifications: flag only clear errors with evidence. Brevity, a missing apology, casual friendliness or an exclamation mark are not tone problems.
wrong_fix is only for an instruction, cause or fix that is actually wrong for this case; asking questions, skipping a verification/approval step
before a correct action, promising too much, leaking, or a correct step slightly early are other types (or not errors). skipped_required_step is
only when the draft performs, claims, or promises an action whose required precondition (identity check, approval, required form) is not met.
Errors may co-occur; list every type that clearly applies.`;
export const GRADE_LABELS = ['wrong_fix', 'skipped_required_step', 'asked_known_info', 'unauthorized_promise', 'missing_needed_question', 'leaked_internal', 'tone'];

export const GRADE = ({ kb, sop, key, requestType, summary, thread, resolution, kbUsed, reply }) => `Grade a support trainee's draft reply in a practice ticket.
${GRADE_DEFS}

KNOWLEDGE BASE:
${kb}

SOPs (rules agents must follow):
${sop}

TICKET ${key} (${requestType}): ${summary}
Conversation so far (internal notes are visible to agents only, not to the customer):
${thread}

Real resolution of this ticket (for your reference): ${resolution}   KB used: ${kbUsed}

TRAINEE'S DRAFT NEXT REPLY:
"""${reply}"""

List the errors in the draft. Use [] if it is a good reply. For each error, quote the sentence of the draft that shows it and the KB or SOP line
(with its id) that it breaks; for asked_known_info quote the customer's earlier words. Also name one thing the reply did well, if any.
Return only JSON: {"errors": [{"type": "<error type>", "quote": "...", "source": "KB-x / SOP-y: the line"}], "good": "short or empty", "why": "short"}`;

export const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    errors: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: GRADE_LABELS }, quote: { type: 'string' }, source: { type: 'string' } }, required: ['type'] } },
    good: { type: 'string' },
    why: { type: 'string' },
  },
  required: ['errors'],
};

// ------------------------------------------------------------------ step 6: solved check
export const SOLVED_SYS = 'You are a strict senior support engineer judging whether a proposed fix would solve a known issue. Follow the output format exactly.';
export const SOLVED = ({ summary, resolution, kb, conv, proposal }) => `A support trainee is working a practice ticket. You know how the real ticket was actually solved.

TICKET: ${summary}
REAL RESOLUTION (what actually fixed it): ${resolution}

KB articles that apply:
${kb}

Practice conversation so far:
${conv}

TRAINEE'S NEW MESSAGE (it proposes a step or fix):
"""${proposal}"""

If the customer did exactly what this message asks, would the problem be fixed?
- "solved": the steps address the real cause and would fix it, the same way as the real resolution or an equivalent way the KB allows.
  Wording, order and extra harmless steps do not matter. A partial step that leaves the cause in place is not solved.
- "made_worse": the steps would clearly damage things for this case (the KB forbids it, it loses data, it locks the account, it breaks more).
- "not_yet": anything else: unrelated, incomplete, only a diagnostic, only a question, or a different fix that would not work here.
Return only JSON: {"verdict": "solved|not_yet|made_worse", "why": "one short sentence"}`;
export const SOLVED_SCHEMA = { type: 'object', properties: { verdict: { type: 'string', enum: ['solved', 'not_yet', 'made_worse'] }, why: { type: 'string' } }, required: ['verdict'] };

// ------------------------------------------------------------------ step 0: personal data pass
export const PII_SYS = 'You find personal data in support tickets so it can be replaced. Follow the output format exactly.';
export const PII = (text) => `Find personal data in this support ticket text: names of people, personal or company email addresses, phone numbers,
street addresses, names of customer companies and of hotels or other private places tied to a person, employee or badge numbers, and account usernames.
Do NOT list technical values that the support work needs: error codes, product names, software versions, hostnames of the company's own systems,
gateway names, device models, request types, dates and times, or names of well-known products and services.
Copy each value exactly as written.

TEXT:
${text}

Return only JSON: {"items": [{"value": "exact text", "type": "person|email|phone|address|company|place|employee_id|username"}]}`;
export const PII_SCHEMA = { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { value: { type: 'string' }, type: { type: 'string' } }, required: ['value', 'type'] } } }, required: ['items'] };

// JSON schemas for the frozen calls when they run through a forced tool call on Forge LLMs.
export const CARD_SCHEMA = {
  type: 'object',
  properties: {
    persona: { type: 'string' }, opening_summary: { type: 'string' },
    facts: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, detail: { type: 'string' }, asked_by: { type: 'string' }, kind: { type: 'string', enum: ['fact', 'reaction'] } }, required: ['detail', 'asked_by'] } },
  },
  required: ['persona', 'facts'],
};
export const SELECT_SCHEMA = {
  type: 'object',
  properties: { release: { type: 'array', items: { type: 'string' } }, kind: { type: 'string', enum: ['question', 'fix_proposal', 'asks_unknowable', 'small_talk', 'other'] } },
  required: ['release', 'kind'],
};
