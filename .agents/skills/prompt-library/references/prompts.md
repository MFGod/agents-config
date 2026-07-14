# Prompt library — 50 templates

Vendored from Anthropic's official Claude Code prompt library
(https://code.claude.com/docs/en/prompt-library). Each entry: id/title,
SDLC phase · category · roles, the prompt template with `{slots}`, slot
defaults, a one-line "why this works", and source.

Fill `{slots}` with project-real values before sending. Apply the 6 patterns in
`../SKILL.md`.

**Sources:** workflows = Common workflows · teams = How Anthropic teams use
Claude Code · best-practices = Best practices · ebook = Scaling agentic coding
guide · legal = How Anthropic uses Claude in Legal · cybersecurity = How
Anthropic uses Claude in Cybersecurity.

---

## discover

### get-oriented-in-a — Get oriented in a new repository
- **Phase:** discover · **Cat:** Onboard · **Roles:** —
- **Prompt:** `give me an overview of this codebase: architecture, key directories, and how the pieces connect`
- **Why:** Describe what you want to know, not which files to read; Claude explores and returns how it fits together.
- **Source:** workflows
- **Next:** `/init` to set up `CLAUDE.md` so Claude remembers this every session.

### explain-unfamiliar-code — Explain unfamiliar code
- **Phase:** discover · **Cat:** Understand · **Roles:** —
- **Prompt:** `explain what {path} does and how data flows through it. write it up as {format}`
- **Slots:** path=`src/scheduler/queue.ts`, format=`an HTML page with a diagram, then open it in my browser`
- **Why:** Name the file and the answer format; swap HTML for diagram/bullets.
- **Source:** workflows
- **Next:** Set an output style so Claude always explains in your preferred format.

### find-where-something-happens — Find where something happens
- **Phase:** discover · **Cat:** Understand · **Roles:** —
- **Prompt:** `where do we {behavior}?`
- **Slots:** behavior=`validate uploaded file types`
- **Why:** Search by behavior, not filename — works when you don't know the file name or dir.
- **Source:** workflows

### see-what-depends-on — Check what breaks before you delete
- **Phase:** discover · **Cat:** Understand · **Roles:** —
- **Prompt:** `what would break if I deleted {target}?`
- **Slots:** target=`the retryWithBackoff helper`
- **Why:** Ask before removing; the caller/downstream list sizes the change.
- **Source:** workflows

### trace-how-code-evolved — Trace how code evolved
- **Phase:** discover · **Cat:** Understand · **Roles:** —
- **Prompt:** `look through the commit history of {path} and summarize how it evolved and why`
- **Slots:** path=`internal/auth/session.go`
- **Why:** Point at commit history when the question is why, not what.
- **Source:** best-practices

### scope-a-change-before — Scope a change before you start
- **Phase:** discover · **Cat:** Understand · **Roles:** pm, design
- **Prompt:** `which files would I need to touch to {change}?`
- **Slots:** change=`add a dark mode toggle to settings`
- **Why:** Size the work before committing to a roadmap; file list = one component vs cross-cutting.
- **Source:** teams

### ask-the-codebase-a — Ask the codebase a product question
- **Phase:** discover · **Cat:** Understand · **Roles:** pm
- **Prompt:** `I am a {role}. walk me through what happens when a user {action}, from the UI down to the result`
- **Slots:** role=`PM`, action=`clicks Export to PDF`
- **Why:** State your role so the answer is pitched at the right level.
- **Source:** teams
- **Next:** Set an output style so answers always pitch at this level.

---

## design

### plan-a-multi-file — Plan a multi-file change before touching code
- **Phase:** design · **Cat:** Plan · **Roles:** pm, design
- **Prompt:** `plan how to refactor the {target} to {goal}. list the files you would change, but don't edit anything yet`
- **Slots:** target=`payment module`, goal=`support multiple currencies`
- **Why:** "don't edit yet" separates exploration from changes. For plan-first by default, use plan mode (Shift+Tab).
- **Source:** workflows
- **Bridge:** maps to gstack PLAN phase.

### draft-a-spec-by — Draft a spec by interview
- **Phase:** design · **Cat:** Plan · **Roles:** pm
- **Prompt:** `I want to build {feature}. interview me about implementation, UX, edge cases, and tradeoffs until we have covered everything, then write the spec to SPEC.md`
- **Slots:** feature=`per-workspace rate limits`
- **Why:** Ask to be interviewed; Claude asks structured questions then writes the file.
- **Source:** best-practices
- **Next:** Save interview questions as a `/spec` skill.

### turn-a-meeting-into — Turn a meeting into tickets
- **Phase:** design · **Cat:** Plan · **Roles:** pm
- **Prompt:** `read {input} and write up the action items, then create a {tracker} ticket for each with acceptance criteria`
- **Slots:** input=`@meeting-notes.md`, tracker=`Linear`
- **Needs:** tracker
- **Why:** Skip transcription; pull action items from unstructured input → tracker via MCP.
- **Source:** teams
- **Next:** Save as a `/tickets` skill.

### map-edge-cases-before — Map edge cases before building
- **Phase:** design · **Cat:** Plan · **Roles:** design, pm
- **Prompt:** `list the error states, empty states, and edge cases for {feature} that the design needs to cover`
- **Slots:** feature=`the file upload flow`
- **Why:** Ask for what's missing, not what's there.
- **Source:** teams

### turn-a-mockup-into — Turn a mockup into a working prototype
- **Phase:** design · **Cat:** Prototype · **Roles:** design, pm, marketing
- **Paste:** mockup
- **Prompt:** `here is a mockup. build a working prototype I can click through, matching the layout and states shown`
- **Why:** A clickable prototype answers questions a static mockup can't.
- **Source:** teams

### implement-from-a-screenshot — Implement from a screenshot and self-check
- **Phase:** design · **Cat:** Prototype · **Roles:** design
- **Paste:** design
- **Needs:** browser
- **Prompt:** `implement this design, then take a screenshot of the result, compare it to the original, and fix any differences`
- **Why:** Gives Claude a verification loop: render → compare → iterate.
- **Source:** best-practices
- **Next:** Use `/goal` to iterate until screenshots match.

---

## build

### follow-an-existing-pattern — Follow an existing pattern
- **Phase:** build · **Cat:** Implement · **Roles:** —
- **Prompt:** `look at how {example} is implemented to understand the pattern, then build {new} the same way`
- **Slots:** example=`the GitHub webhook handler`, new=`a Stripe webhook handler`
- **Why:** Point at code you like; without a reference Claude defaults to generic best practices.
- **Source:** best-practices
- **Next:** Write the pattern into `CLAUDE.md` so future sessions match it.
- **Bridge:** maps to gstack BUILD + structured-response "match conventions".

### generate-docs-for-code — Generate docs for undocumented code
- **Phase:** build · **Cat:** Implement · **Roles:** docs
- **Prompt:** `find {scope} without {format} comments and add them, matching the style already used in the file`
- **Slots:** scope=`the public functions in src/auth/`, format=`JSDoc`
- **Why:** Name scope and format; Claude matches existing comment style.
- **Source:** workflows

### add-a-small-well — Add a small, well-defined feature
- **Phase:** build · **Cat:** Implement · **Roles:** —
- **Prompt:** `add a {endpoint} endpoint that returns {payload}`
- **Slots:** endpoint=`/health`, payload=`the app version and uptime`
- **Why:** State inputs/outputs, not how to build; Claude places it alongside similar code.
- **Source:** workflows

### build-a-small-internal — Build a small internal tool from scratch
- **Phase:** build · **Cat:** Implement · **Roles:** pm, design, marketing, docs
- **Prompt:** `create a {tool} using HTML, CSS, and vanilla JavaScript, then open it in my browser`
- **Slots:** tool=`drag-and-drop Kanban board with three columns`
- **Why:** No project/framework/build step needed; describe the tool and see it working.
- **Source:** teams

### work-an-issue-end — Work an issue end to end
- **Phase:** build · **Cat:** Implement · **Roles:** —
- **Prompt:** `read issue #{issue}, implement the fix, and run the tests`
- **Slots:** issue=`312`
- **Needs:** gh
- **Why:** Give the issue number, not a summary; Claude reads the full ticket and validates.
- **Source:** workflows

### find-and-update-copy — Find and update copy across the codebase
- **Phase:** build · **Cat:** Implement · **Roles:** design, docs, marketing
- **Prompt:** `find every place we say "{copy}" or a close variant, show me each one in context, then update them all to "{new}". leave tests and the changelog alone`
- **Slots:** copy=`Sign up free`, new=`Start free trial`
- **Why:** Ask for variants + what to skip; finds phrasings literal search misses.
- **Source:** teams

### draft-from-past-examples — Draft a document from past examples
- **Phase:** build · **Cat:** Implement · **Roles:** docs, marketing, pm
- **Prompt:** `read the {examples} in {folder} to learn the structure and voice, then draft a new one for {topic}`
- **Slots:** examples=`privacy impact assessments`, folder=`legal/pia/`, topic=`the new analytics integration`
- **Why:** Point at finished work; Claude learns structure/voice from what you've shipped.
- **Source:** legal
- **Next:** Save the voice as a skill.

### write-tests-run-them — Write tests, run them, fix failures
- **Phase:** build · **Cat:** Test · **Roles:** —
- **Prompt:** `write tests for {path}, run them, and fix any failures`
- **Slots:** path=`app/parsers/feed.py`
- **Why:** Ask for write+run+fix together so Claude iterates without stopping.
- **Source:** workflows
- **Bridge:** maps to gstack TEST + dev-workflow "покажи вывод тестов".

### drive-implementation-from-tests — Drive implementation from tests
- **Phase:** build · **Cat:** Test · **Roles:** —
- **Prompt:** `write tests for {feature} first, then implement it until they pass`
- **Slots:** feature=`the password reset flow`
- **Why:** TDD — tests define done; Claude iterates until they pass.
- **Source:** ebook

### fill-gaps-from-a — Fill gaps from a coverage report
- **Phase:** build · **Cat:** Test · **Roles:** —
- **Prompt:** `read {report} and add tests for the lowest-covered files until each is above {target}%`
- **Slots:** report=`coverage/coverage-summary.json`, target=`80`
- **Why:** Point at coverage numbers, not guess; write tests where needed most.
- **Source:** workflows
- **Next:** Set as a `/goal` to keep going until coverage hits target.

### migrate-a-pattern-across — Migrate a pattern across the codebase
- **Phase:** build · **Cat:** Refactor · **Roles:** —
- **Prompt:** `migrate everything from {from} to {to}: identify every place that needs to change, then make the changes`
- **Slots:** from=`the old logging API`, to=`the structured logger`
- **Why:** Identify every place first so call sites are listed — check none missed.
- **Source:** workflows

### port-code-between-languages — Port code to another language
- **Phase:** build · **Cat:** Refactor · **Roles:** —
- **Prompt:** `port {source} to {target}, keeping the same {keep}`
- **Slots:** source=`this Python module`, target=`Rust`, keep=`public API and test behavior`
- **Why:** Say what to preserve — gives Claude a contract to check the port against.
- **Source:** teams

### optimize-against-a-measurable — Optimize against a measurable target
- **Phase:** build · **Cat:** Refactor · **Roles:** data
- **Prompt:** `optimize {target} to bring {metric} from {current} down to under {goal}`
- **Slots:** target=`the search query`, metric=`p95 latency`, current=`2s`, goal=`500ms`
- **Why:** Stating metric + target gives a clear definition of done.
- **Source:** ebook
- **Next:** Set as a `/goal` to keep measuring until it hits the number.

### fix-a-precise-visual — Fix a precise visual bug
- **Phase:** build · **Cat:** Refactor · **Roles:** design
- **Prompt:** `the {element} extends {amount} beyond the {container} on {viewport}. fix it.`
- **Slots:** element=`login button`, amount=`20px`, container=`card border`, viewport=`mobile`
- **Why:** Precise visual feedback gets a precise fix — state exact element, measurement, viewport.
- **Source:** ebook
- **Next:** Add a preview tool so Claude screenshots and verifies.

### review-your-changes-before — Review your changes before you commit
- **Phase:** build · **Cat:** Review · **Roles:** —
- **Prompt:** `review my uncommitted changes and flag anything that looks risky before I commit`
- **Why:** Catch problems while cheap; Claude reads changed files in full, not just diff lines.
- **Source:** workflows
- **Next:** `/code-review` for the same check in one command.
- **Bridge:** maps to gstack REVIEW.

### review-a-pull-request — Review a pull request
- **Phase:** build · **Cat:** Review · **Roles:** —
- **Prompt:** `review PR #{pr} and summarize what changed, then list any concerns`
- **Slots:** pr=`247`
- **Needs:** gh
- **Why:** Claude reviews with whole codebase in context, not just diff.
- **Source:** workflows
- **Next:** Turn on for every PR with Code Review.

### review-infrastructure-changes-before — Review infrastructure changes before applying
- **Phase:** build · **Cat:** Review · **Roles:** security, ops
- **Paste:** plan
- **Prompt:** `here is my Terraform plan output. what is this going to do, and is anything here going to cause problems?`
- **Why:** Plan output is dense; paste it for a plain-language summary of what changes.
- **Source:** teams

### run-a-security-review — Run a security review with a subagent
- **Phase:** build · **Cat:** Review · **Roles:** security
- **Prompt:** `use a subagent to review {path} for security issues and report what it finds`
- **Slots:** path=`src/api/`
- **Why:** A subagent runs the audit in its own context and reports back — keeps your main session clean.
- **Source:** best-practices
- **Next:** Set up a dedicated security-review subagent for the team.
- **Bridge:** kit has `/security-review` skill.

### review-content-before-sending — Catch issues before formal review
- **Phase:** build · **Cat:** Review · **Roles:** marketing, docs
- **Prompt:** `review {file} for {concerns} and list anything I should fix before it goes to {reviewer}`
- **Slots:** file=`launch-post.md`, concerns=`unsupported claims, missing attributions, and brand-guideline issues`, reviewer=`legal`
- **Why:** First pass before a human spends time; name the concerns so review is focused.
- **Source:** legal
- **Next:** Capture your review checklist as a skill.

### course-correct-a-wrong — Course-correct a wrong approach
- **Phase:** build · **Cat:** Steer · **Roles:** —
- **Prompt:** `that is not right: {feedback}. try a different approach`
- **Slots:** feedback=`the function signature needs to stay backward-compatible`
- **Why:** Name the constraint Claude missed — a specific reason gives a concrete constraint on retry.
- **Source:** best-practices
- **Bridge:** maps to gstack loop-back / deviation protocol.

### narrow-the-scope-of — Narrow the scope of a change
- **Phase:** build · **Cat:** Steer · **Roles:** —
- **Prompt:** `that is too much. keep only the changes to {scope} and undo your other edits`
- **Slots:** scope=`the validation logic in src/forms/`
- **Why:** Direction right but too broad — keep part rather than rewind all; stated boundary prevents scope creep.
- **Source:** best-practices

### turn-a-correction-into — Turn a correction into a rule
- **Phase:** build · **Cat:** Steer · **Roles:** —
- **Prompt:** `you keep {mistake}. add a rule to CLAUDE.md so this stops happening`
- **Slots:** mistake=`using default exports when this project uses named exports`
- **Why:** A chat correction isn't shared; a `CLAUDE.md` rule is shared once committed and read every session.
- **Source:** best-practices
- **Next:** `/memory` to review what Claude wrote.
- **Bridge:** overlaps `self-learning` harvest (single-fact → memory/skill).

---

## ship

### resolve-merge-conflicts — Resolve merge conflicts
- **Phase:** ship · **Cat:** Git · **Roles:** —
- **Prompt:** `resolve the merge conflicts in this branch and explain what you kept from each side`
- **Why:** Say the state you want, not which markers to keep; asking for reasoning makes merge reviewable.
- **Source:** workflows
- **Note:** kit git-conventions: protected branches dev/test/prod — never push directly.

### commit-with-a-generated — Commit with a generated message
- **Phase:** ship · **Cat:** Git · **Roles:** —
- **Prompt:** `commit these changes with a message that summarizes what I did`
- **Why:** Let Claude derive the message from the diff; matches existing commit style.
- **Source:** workflows
- **Note:** kit git-conventions — Conventional Commits, never commit without explicit user request.

### open-a-pull-request — Open a pull request from a ticket
- **Phase:** ship · **Cat:** Git · **Roles:** —
- **Prompt:** `find the {tracker} ticket about {topic} and open a PR that implements it`
- **Slots:** tracker=`Linear`, topic=`the login timeout`
- **Needs:** tracker
- **Why:** One prompt reads the spec, makes the change, opens the PR — no context switch.
- **Source:** workflows
- **Note:** kit git-conventions — PR ≤400 lines, one atomic change.

### draft-release-notes-from — Draft release notes from git history
- **Phase:** ship · **Cat:** Release · **Roles:** pm, docs, marketing
- **Prompt:** `compare {from} to {to} and draft release notes grouped by feature, fix, and breaking change`
- **Slots:** from=`v2.3.0`, to=`v2.4.0`
- **Why:** Two reference points + structure; Claude reads the commit log between them.
- **Source:** workflows
- **Next:** Save as a `/changelog` skill.

### write-a-ci-workflow — Write a CI workflow
- **Phase:** ship · **Cat:** Release · **Roles:** ops
- **Prompt:** `write a GitHub Actions workflow that {steps} on every push to {branch}`
- **Slots:** steps=`runs the tests and deploys to staging`, branch=`main`
- **Why:** Describe when + what; YAML generated matched to project's build/test commands.
- **Source:** workflows

---

## operate

### find-and-fix-a — Find and fix a failing test
- **Phase:** operate · **Cat:** Debug · **Roles:** —
- **Prompt:** `the {test} test is failing, find out why and fix it`
- **Slots:** test=`UserAuth`
- **Why:** Describe the symptom; Claude runs the test, traces into source, fixes it.
- **Source:** workflows

### investigate-a-reported-error — Investigate a reported error
- **Phase:** operate · **Cat:** Debug · **Roles:** ops
- **Prompt:** `users are seeing {symptom} on {where}. investigate and tell me what is going on`
- **Slots:** symptom=`500 errors`, where=`/api/settings`
- **Why:** Describe symptom + location; Claude reads the code path and traces causes. Paste stack traces/logs if you have them.
- **Source:** workflows
- **Next:** Put a deeplink in your runbook that opens Claude with this prompt pre-filled.

### fix-a-build-error — Fix a build error at the root
- **Phase:** operate · **Cat:** Debug · **Roles:** ops
- **Paste:** error
- **Prompt:** `here is a build error. fix the root cause and verify the build succeeds`
- **Why:** Asking for root cause + verification prevents surface patches that suppress the error.
- **Source:** best-practices

### investigate-a-production-incident — Investigate a production incident
- **Phase:** operate · **Cat:** Incident · **Roles:** ops, security
- **Prompt:** `{symptom}. check the logs, recent deploys, and config changes, then tell me the most likely cause`
- **Slots:** symptom=`the checkout endpoint started returning 500s an hour ago`
- **Why:** List evidence sources to correlate, not steps to take.
- **Source:** workflows
- **Next:** Connect Sentry / log store via MCP.

### diagnose-from-a-console — Diagnose from a console screenshot
- **Phase:** operate · **Cat:** Incident · **Roles:** ops, data
- **Paste:** screenshot
- **Prompt:** `here is a screenshot of {console}. walk me through why {resource} is failing and give me the exact commands to fix it`
- **Slots:** console=`the GCP Kubernetes dashboard`, resource=`this pod`
- **Why:** Cloud consoles show the problem but not the commands; Claude translates the dashboard into kubectl/gcloud/aws commands.
- **Source:** teams

### query-logs-in-plain — Query logs in plain English
- **Phase:** operate · **Cat:** Incident · **Roles:** security, ops, data
- **Prompt:** `show me all {events} for {scope} over {timeframe}. write the query, run it, and tell me what stands out`
- **Slots:** events=`failed logins`, scope=`the auth service`, timeframe=`the past 24 hours`
- **Needs:** db
- **Why:** Ask the question, not the SQL; Claude builds, runs, and shows both query and result.
- **Source:** cybersecurity

### analyze-a-data-file — Analyze a data file
- **Phase:** operate · **Cat:** Data · **Roles:** data, pm, marketing
- **Paste:** csv
- **Prompt:** `read {file}, summarize the key patterns, and write the results to {output}`
- **Slots:** file=`@reports/q1-signups.csv`, output=`an HTML page with charts, then open it in my browser`
- **Why:** A one-off question doesn't need a one-off script; point at a file and Claude reads it directly.
- **Source:** teams
- **Next:** Connect the data source via MCP instead of exporting files.

### generate-variations-from-performance — Generate variations from performance data
- **Phase:** operate · **Cat:** Data · **Roles:** marketing, data
- **Paste:** csv
- **Prompt:** `read {file}, find the underperforming {items}, and generate {n} new variations that stay under {limit} characters`
- **Slots:** file=`@ads-performance.csv`, items=`headlines`, n=`20`, limit=`90`
- **Why:** State the constraint at the start so generation stays within the limit.
- **Source:** teams
- **Next:** Connect the ad platform via MCP.

### turn-a-recurring-task — Turn a recurring task into a skill
- **Phase:** operate · **Cat:** Automate · **Roles:** —
- **Prompt:** `create a /{name} skill for this project that {steps}`
- **Slots:** name=`ship`, steps=`runs the linter and tests, then drafts a commit message`
- **Why:** Name the steps once; reuse as a command anyone can run.
- **Source:** workflows
- **Bridge:** overlaps `self-learning` — but this is a user-typed prompt, self-learning is autonomous harvest.

### add-a-hook-for — Add a hook for repeat behavior
- **Phase:** operate · **Cat:** Automate · **Roles:** —
- **Prompt:** `write a hook that {action} after every {event}`
- **Slots:** action=`runs prettier`, event=`edit to a .ts or .tsx file`
- **Why:** Hooks make behavior automatic; describe trigger + action and Claude writes the config.
- **Source:** best-practices
- **Note:** kit uses hooks (settings.json) — see `update-config` skill.

### connect-a-tool-with — Connect a tool with MCP
- **Phase:** operate · **Cat:** Automate · **Roles:** —
- **Prompt:** `set up the {server} MCP server so you can read my {data} directly`
- **Slots:** server=`Sentry`, data=`error reports`
- **Why:** Connect the source once instead of pasting data every session.
- **Source:** workflows

### capture-what-to-remember — Capture what to remember for next time
- **Phase:** operate · **Cat:** Automate · **Roles:** pm, docs
- **Prompt:** `summarize what we did this session and suggest what to add to CLAUDE.md`
- **Why:** Ask before you forget; Claude proposes CLAUDE.md entries so the next session starts with context.
- **Source:** teams
- **Bridge:** overlaps `self-learning` harvest + native memory triage.