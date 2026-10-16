# Aqion Relay — slide source and speaker notes

## 01 — Aqion Relay

aqionlabs.ai

Aqion Relay

Recover supply.
Protect operating cash.

A practical recovery copilot for UAE SME distributors.

LIVE MVP

https://duignytemvp.aqionlabs.workers.dev

GITHUB SOURCE

https://github.com/Jaferdecodesai/DuIgnyteMVP_Aqionlabs

**Speaker notes**

Aqion Relay helps a non-perishable goods distributor compare recovery purchases against an owner-defined cash floor. The public MVP uses fictional SME and supplier data. It trains a numerical forecast, evaluates feasible alternatives and saves an unsent draft only after owner confirmation. No order is sent and no funds move. The two cover links take judges directly to the public source and the verified live demonstration.

Sources: S01 · S08

## 02 — A shipment slips. Two commitments collide.

aqionlabs.ai

A shipment slips.
Two commitments collide.

Keep customer
orders moving

A delayed inbound shipment creates an immediate gap
in stock availability.

Keep the business
operating

A replacement purchase must leave room for existing
payments and the owner’s cash floor.

Which recovery purchase is feasible — and worth approving?

**Speaker notes**

The initial segment is non-perishable packaging and general trading distributors. Relay starts with one SKU and a 30-day view. A delayed inbound shipment threatens fulfilment while a replacement order competes for cash reserved for existing obligations. This is the operational decision we will validate with consenting SMEs, not a claim of completed customer research.

Sources: Product proposition / proposed operating plan

## 03 — One focused decision. A strong fit with existing SME tools.

aqionlabs.ai

One focused decision.
A strong fit with existing SME tools.

Disruption to decision

Stress-test shipment delay,
demand and freight in one owner
workflow.

Works beside the ERP

Read a normalized snapshot;
return a reviewable recovery draft.

Cash-aware recovery

Compare service impact and
minimum daily cash before
approval.

Positioning: a recovery decision layer for the tools SMEs already use.

**Speaker notes**

We selected the ResilienceTech track. Inventory tools already support replenishment and purchase orders. Relay focuses on the decision between disruption and approved action: compare supply recovery under a daily cash constraint, then retain source-bound evidence. This complements existing systems. It is not a claim that the combination is globally unique. Liquidity finance is not the initial execution scope; Relay does not move funds.

Sources: S01 · S04 · S05

## 04 — From disruption to an auditable draft.

aqionlabs.ai

From disruption to an auditable draft.

1

Read

Stock, sales,
scheduled cash and
supplier terms.

2

Stress-test

Delay, demand and
freight under
owner-set limits.

3

Compare

Fulfilment, stockouts,
spend and daily cash.

4

Review

Quantities, source
freshness and the
cash floor.

5

Approve

Save an unsent draft
and export its
evidence.

**Speaker notes**

The current MVP supports this complete sequence with synthetic records. The owner selects a fictional SME, adjusts the disruption, runs the scenario and compares stock and cash. A review dialog shows supplier quantities, costs and terms. Explicit confirmation creates an unsent synthetic draft. Approval rechecks the current snapshot, calculation version and constraints; duplicates return the existing result.

Sources: S08

## 05 — A recovery choice you can inspect.

aqionlabs.ai

A recovery choice you can inspect.

Wait

990

Recover

1,362

372 additional units served in this scenario

AED 7,887.50

400 units · arrival day 4

AED 28,112.50

minimum cash vs AED 24,000 floor

**Speaker notes**

Reference fixture: packaging SME; shipment delay 7 days; demand increase 20%; freight increase 25%; cash floor AED 24,000. The model evaluates 130 combinations including baseline. Baseline fulfilment is 990 of 1,362 projected units with 9 stockout days. The recommended evaluated order is 400 units from fictional Oasis, arriving on day 4. It costs AED 7,887.50 including fictional VAT-inclusive item price and adjusted freight. It fulfils 1,362 projected units with zero stockout days and minimum projected cash AED 28,112.50. These are model outputs on fiction, not measured customer gains. Model assumptions include prepaid original inbound stock, recovery paid on day 1, scheduled receipts only and obligations before same-day receipts.

Sources: S08

## 06 — Forecast numerically. Decide within hard constraints.

aqionlabs.ai

Forecast numerically.
Decide within hard constraints.

Forecast with a
visible comparator

Weekday + trend ridge regression
versus seasonal naive; labelled
fallback for sparse history.

Simulate stock
and daily cash

Bounded supplier combinations.
MOQ, pack, cap, lead time, quote
validity and cash floor.

Explain, review
and confirm

Traceable assumptions and
version checks. The owner
confirms the unsent recovery
draft.

**Speaker notes**

The forecast fits weekday and trend ridge regression to fictional fulfilled-sales history, comparing the last 14 days against a seasonal-naive baseline; it chooses the lower synthetic holdout-error method and refits as applicable. Short or constant histories use a labelled trailing-average fallback. The same holdout is used for model selection, so it is not an independent final quality test. Fulfilled sales may censor true demand. Candidate quantities obey approved-supplier status, quote expiry, MOQ, pack size, cap and lead time. Enumeration is bounded, at most 8,000 combinations in the current three-supplier slice, not a proof of a global optimum. Deterministic templates explain the calculation; no live generative model decides purchases.

Sources: S08

## 07 — A mobile workbench, with a complete decision trail.

aqionlabs.ai

A mobile workbench,
with a complete decision trail.

01

Compare clearly

Stock and cash curves, daily data and feasible options.

02

Review deliberately

Confirmation, stale-source blocks and duplicate protection.

03

Keep the evidence

Persisted drafts, readable audit history and portable JSON.

**Speaker notes**

The implemented web MVP offers Overview, Evidence, Connections and Pilot views. It supports scenario controls, stock/cash charts, a 30-day data table, owner review, saved unsent drafts, cancellation, synthetic JSON import/export and per-SME reset. Anonymous browser sessions isolate demonstration workspaces. This is not enterprise identity. The running Cloudflare app is verified separately through the live cover link. Mobile and automated validation evidence is retained with the repository; exact test counts belong to current CI, not an evergreen claim on this slide.

Sources: S08

## 08 — One deployment. Persistent, isolated demo workspaces.

aqionlabs.ai

One deployment.
Persistent, isolated demo workspaces.

Next / React UI

Responsive workbench
Accessible table alternative

Assets + API routing

Serve the React workbench
Route the workspace request

Engine + SQLite

Forecast, simulate, approve
Atomic state + draft + audit

**Speaker notes**

The production deployment uses a static-export Next.js/React frontend served as Cloudflare Worker assets. The API, numerical engine and domain services run inside a native SQLite-backed Durable Object, using transactionSync for atomic draft, audit and version checks. Signed anonymous sessions, same-origin/CSRF controls and bounded inputs guard the public synthetic workflow. A workspace transaction preserves approval and audit integrity. This is not enterprise tenant IAM; the production-pilot roadmap adds authenticated roles, approved processing/data location, connector credentials and operational restore acceptance. No local filesystem database or Hostinger/MySQL service is required for the Cloudflare release.

Sources: S06 · S07 · S08

## 09 — Read first. Reconcile every write. Then expand through du.

aqionlabs.ai

Read first. Reconcile every write.
Then expand through du.

Map + authorize

Consented snapshots,
terms and source IDs

Connect
read-only

Zoho stock, sales and
scheduled cash
mapping

Draft + reconcile

Owner approval, ERP
outbox and
idempotency

Enable
distribution

Agreed du interfaces,
support and monitoring

Accountability: AqionLabs builds · SME owner validates · du sponsors integration and acceptance

**Speaker notes**

Proposed eight-week integration preparation, with responsibilities and acceptance gates. Weeks 1–2: AqionLabs maps consented snapshots, SME owners verify terms and the du sponsor approves scope; gate is required-field coverage and approved processing/security design. Weeks 3–4: AqionLabs builds a scoped read-only Zoho adapter using organization and region context; reconcile normalized snapshot against source totals and handle event IDs/revisions. Weeks 5–6: add owner-authorized ERP drafts with idempotency/outbox and reconciliation, sandbox-tested; ambiguous writes remain pending reconciliation. Weeks 7–8: configure sponsor-agreed du identity/billing/distribution interfaces and operational monitoring; no du interface is claimed connected. Each period starts when its dependencies are approved. Pilot comparison begins only after acceptance. Odoo is a subsequent adapter subject to exact version/plan, not a prerequisite for the first pilot.

Sources: S05 · S09

## 10 — 160 SMEs. Four waves. A credible comparison.

aqionlabs.ai

160 SMEs. Four waves.
A credible comparison.

160

Enrollment target

4 × 40
20 immediate +
20 delayed per wave

Wave 1

Wave 2

Wave 3

Wave 4

**Speaker notes**

Proposed enrollment: 160 consenting non-perishable-goods distributors; at least 150 enrolled before intervention. du sponsors recruitment; AqionLabs operates onboarding, support and analysis; an evaluation lead preregisters outcomes and completes power/MDE analysis before intervention. Four waves of 40 start in pilot weeks 1,2,3,4. Each receives two common baseline weeks then six comparison weeks; within each wave and sector/size/ERP strata, randomize 20 immediate and 20 delayed-access SMEs. The last comparison ends in week 11, analysis occurs in week 12. Delayed access follows its comparison window. Enrollment begins after the integration and operational acceptance gates, not during an unsafe live-write trial. Record screened, enrolled, randomized, activated, completed, withdrawn and missing-data counts; do not replace dropouts after randomization. A 160-SME feasibility cohort alone does not establish statistical power.

Sources: S01 · S09

## 11 — Measure better decisions. Keep operational guardrails absolute.

aqionlabs.ai

Measure better decisions.
Keep operational guardrails absolute.

40%

Faster feasible planning

Primary target: common disruption
drill to owner-approved,
rubric-passing plan.

90%

Feasible-plan rate

Target share of assigned drills with
an approved plan passing blinded
scoring.

70%

Weekly workflow use

Target share of SMEs with access
reviewing at least one scenario each
week.

STOP RULES / Projected cash-floor breach · unauthorized write · duplicate external effect

**Speaker notes**

All percentages on this slide are prospective pilot targets, not achieved customer outcomes. Primary outcome: time from equivalent disruption brief to owner-approved plan that passes a predetermined blinded feasibility rubric. Use baseline-adjusted log-time comparison with SME assignment, wave/calendar and strata; report effect and 95% interval plus raw medians. Include non-completion under a preregistered capped-time rule with sensitivity analysis. Target 40% shorter time. Secondary feasibility target: at least 90% rubric-passing approved plans, all assigned drills in denominator. Adoption target: 70% of SMEs with access review at least one scenario per week, reporting opportunity and reasons for non-use. Exploratory stockout target is 15% reduction, reported separately with uncertainty and no causal before/after shortcut. Zero projected floor breaches, unauthorized external writes and duplicate external effects are stop rules for the later live pilot, not claims that predicted cash guarantees actual cash. Monitor source completeness and reconciliation latency. Independent baseline variance/power analysis determines whether efficacy or feasibility interpretation is justified.

Sources: S09

## 12 — A narrow wedge. A repeatable route through du.

aqionlabs.ai

A narrow wedge.
A repeatable route through du.

160

Pilot cohort target

Validate decision value, source
quality and support demand.

1,000

Controlled rollout

Standardize connectors and
onboarding; enforce cost limits.

40,000+

Scale ambition

Partition workloads; prove peak
load, isolation and restore.

Commercial offer

Per-SME subscription + agreed connector onboarding, distributed through du.

**Speaker notes**

Commercial proposal: a per-SME subscription distributed through du, with connector onboarding and service scope agreed before offer. No price, revenue, customer count or commercial commitment is claimed. Measure onboarding time, weekly use, support minutes and total cost per active SME in the pilot; scale only within a sponsor-approved unit-cost ceiling. Engineering scale path: 160-SME pilot, a 1,000-SME controlled rollout, then load/isolation/restore acceptance for the 40,000+ ambition. An illustrative engineering envelope assumes 1,000 normalized events and four scenarios per SME per day: 40m events/day at 40,000 SMEs, 463 average events/s, 4,630/s at ten-times peak, and 160,000 scenarios/day (1.85 average/s). These are arithmetic assumptions, not measured capacity. Proposed service targets such as p95 scenario latency <5s, availability 99.9%, RPO<=15m and RTO<=4h require sponsor agreement and separate acceptance tests; they are not current contractual SLAs.

Sources: S02 · S03

## 13 — Make the safe action the easiest action.

aqionlabs.ai

Make the safe action
the easiest action.

Input quality

Freshness, required fields and valid supplier terms

Block stale or incomplete approval

Execution integrity

Human confirmation, version checks and
idempotency

ERP outbox + reconciliation gate

Data protection

Isolated demo state; signed session + CSRF

Pilot IAM, approved processing and
restore test

Model reliability

Comparator, fallback and visible assumptions

Monitor forecast error and rejected
scenarios

Accountable operations: monitor exceptions · pause writes on a material breach · reconcile before resuming

**Speaker notes**

Current synthetic MVP controls include validation, source-age and quote checks, scenario/version binding, signed anonymous sessions, same-origin/CSRF checks, bounded input, persistent draft/audit transactions, human confirmation and duplicate protection. These do not constitute enterprise acceptance. Pilot release gates add tenant IAM/roles, approved processing and data location, scoped connector secrets, encryption and restore testing, ERP outbox/reconciliation and incident ownership. Daily monitoring reviews source lag, invalid fields, rejected approvals, write ambiguity and reconciliation age. A material floor/authorization/duplicate violation pauses writes; the operator investigates and the sponsor approves resumption. Forecast error is monitored against naive baseline, sparse histories fall back visibly. No autonomous buying or funds movement is included.

Sources: S06 · S08 · S09

## 14 — Launch the du recovery pilot.

aqionlabs.ai

Launch the du recovery pilot.

A working product.
A measurable pilot.
A clear path to SME scale.

01

Sponsor + recruit

160 consenting SMEs; minimum
150 enrolled.

02

Connect + operate

Named du technical owners and
approved interfaces.

03

Evaluate + expand

Joint scorecard, delivery gates
and cost ceiling.

**Speaker notes**

We seek a du sponsor, recruitment of 160 consenting eligible SMEs with at least 150 enrolled before intervention, technical owners for approved read-only and draft interfaces, and a joint evaluation lead. AqionLabs delivers the working MVP, phased connector engineering, onboarding and pilot evidence. Before pilot week 1, agree success thresholds, processing/security controls, support ownership and the cost ceiling. This is a concrete pilot proposal, not a claim of customers, commercial acceptance, production certification or submitted application. Close by opening the live MVP and showing the default scenario, then the explicit unsent draft review.

Sources: S01 · S09