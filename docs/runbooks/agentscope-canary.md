# AgentScope Shadow and Canary Runbook

## Safety posture

The native Witness executor is the default and rollback authority. AgentScope
may execute only a host-created, already FactLocked atomic task. It cannot own
calculations, context selection, grants, persistence, provider policy, or final
candidate acceptance.

This repository does not auto-promote, deploy, or enable AgentScope. A valid
configuration only makes a request eligible for the orchestration adapter; it
does not replace the native pipeline. Human review and production-operations
approval remain mandatory.

## Disabled baseline

```text
WITNESS_EXECUTOR_MODE=native
AGENTSCOPE_CANARY_PERCENT=0
```

With no AgentScope variables, the parser produces the same native state. Keep
`AGENTSCOPE_INTERNAL_TOKEN` in the deployment secret store. Never put it in
source, logs, routing provenance, URLs, query parameters, or request bodies.

## Shadow-first enablement

1. Confirm the native executor, model gateway, and AgentScope worker health
   checks are green.
2. Confirm the pinned Python environment and the executor conformance suite
   pass.
3. Set the URL, secret token, positive timeout, and narrow tenant/task-class
   allowlists.
4. Set `WITNESS_EXECUTOR_MODE=agentscope-shadow` while leaving
   `AGENTSCOPE_CANARY_PERCENT=0`.
5. Restart through the normal deployment process. Do not start an ad-hoc worker
   from this runbook.
6. Verify native answers are still served and shadow candidates are stored only
   in the bounded comparison store.
7. Review 3–5 outputs using the factual-fidelity, somatic/structural balance,
   non-prescriptive language, and understandable-provenance rubric.

## Required checks before canary

- Zero FactLock mutations.
- Zero unauthorized writes or tool calls.
- Complete terminal events and no orphan spans.
- Complete final-claim source coverage.
- No critical provenance loss or contradiction-rate regression.
- Cancellation, timeout, duplicate, and provider-failure behavior match native.
- p95 latency and cost stay inside the recorded shadow budgets.
- Circuit-breaker, late-response discard, and native fallback tests pass.
- Security approves the Python isolation, token handling, retention, and
  permissions.
- Operations accepts ownership of worker health, rollback, and upgrades.
- A human explicitly records canary approval.

Passing automated gates does not satisfy the human approval requirement.

## Canary enablement

1. Keep the tenant and task-class allowlists narrow.
2. Set `WITNESS_EXECUTOR_MODE=agentscope-canary`.
3. Start with the smallest explicitly approved integer percentage. The default
   remains `0`.
4. Confirm deterministic buckets are stable and ineligible requests remain
   native.
5. Monitor native-fallback rate, circuit state, terminal-event coverage, orphan
   spans, provenance coverage, contradictions, p95 latency, cost, and worker
   saturation.
6. Expand only after another human review and operations approval.

Never infer approval from a green dashboard or automatically increase the
percentage.

## Alerts and incident response

Immediately roll back for FactLock drift, unauthorized writes/tool calls,
missing terminal events, orphan spans, provenance loss, contradiction
regression, sustained latency/cost breach, elevated native-fallback rate,
authentication anomalies, or worker saturation.

Do not log the executor URL, internal token, prompt, context packet, raw worker
response, provider body, authorization header, or user content as routing
provenance. Safe routing decisions contain only enum reasons, booleans,
percentage, and deterministic bucket.

## Rollback and drain

1. Set `WITNESS_EXECUTOR_MODE=native`.
2. Set `AGENTSCOPE_CANARY_PERCENT=0`.
3. Apply the normal configuration rollout.
4. Stop admitting new remote attempts.
5. Drain or cancel in-flight remote jobs within the configured timeout.
6. Discard late remote responses; do not persist or serve them.
7. Prove the same locked reading/context request succeeds through the native
   executor without schema or data migration.
8. Preserve sanitized comparison evidence for the incident review.

Rollback requires no canonical data migration because native remains the
authoritative path.

## Promotion boundary

Only an explicit human decision after shadow and canary review can authorize
broader use. Selemene convergence is a separate gated task. Premium NotebookLM
assets, calculation routes, autoresearch promotion, and public deployment are
outside this runbook.
