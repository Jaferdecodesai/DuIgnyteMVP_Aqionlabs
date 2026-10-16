"""One native scene source for editable PPTX, searchable PDF and offline HTML."""
import json, math, os, textwrap
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parents[1]
CFG=json.loads((ROOT/'build-config.json').read_text())
W,H=1600,900
C={'navy':'102F3A','ink':'193B46','teal':'087F80','mint':'D3EDE0','paper':'F7F5EE','white':'FFFFFF','muted':'536D74','line':'CEDAD7','amber':'9F571F','pale':'ECF2EF','soft':'B5D0CD'}
for key,file in [('regular','InstrumentSans-Regular.ttf'),('bold','InstrumentSans-Bold.ttf'),('display','BricolageGrotesque-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(key,str(ROOT/'assets'/file)))
slides=[]
def slide(kicker,title,dark=False,notes='',refs='',foot=''):
    s={'kicker':kicker,'title':title,'dark':dark,'notes':notes,'refs':refs,'elements':[]}
    slides.append(s)
    rect(s,0,0,W,H,'navy' if dark else 'paper')
    text(s,kicker.upper(),80,57,1200,36,20,'mint' if dark else 'teal',bold=True)
    text(s,'AqionLabs',1350,52,170,38,26,'white' if dark else 'navy',bold=True,align='right')
    if title: text(s,title,80,127,1440,150,61,'white' if dark else 'navy',font='display',leading=1.07)
    line(s,80,829,1520,829,'soft' if dark else 'line',1)
    text(s,f'{len(slides):02}',755,849,90,28,17,'soft' if dark else 'muted',align='center')
    text(s,'AQION RELAY  /  RESILIENCETECH',80,849,550,25,15,'soft' if dark else 'muted',bold=True)
    if refs:text(s,refs,1320,849,200,25,15,'soft' if dark else 'muted',align='right')
    if foot:text(s,foot,80,778,1440,42,19,'soft' if dark else 'muted',leading=1.15)
    return s
def rect(s,x,y,w,h,fill,stroke=None,r=0):
    s['elements'].append(dict(kind='rect',x=x,y=y,w=w,h=h,fill=C.get(fill,fill),stroke=C.get(stroke,stroke),r=r))
def line(s,x,y,x2,y2,color='line',width=2):
    s['elements'].append(dict(kind='line',x=x,y=y,x2=x2,y2=y2,color=C.get(color,color),width=width))
def circle(s,x,y,r,fill):
    s['elements'].append(dict(kind='circle',x=x,y=y,r=r,fill=C.get(fill,fill)))
def image(s,file,x,y,w,h):
    s['elements'].append(dict(kind='image',file=file,x=x,y=y,w=w,h=h))
def text(s,value,x,y,w,h,size=27,color='ink',bold=False,font=None,leading=1.24,align='left',url=None):
    font=font or ('bold' if bold else 'regular')
    wrapped=[]
    for para in value.split('\n'):
        if not para:wrapped.append('');continue
        out=''
        for word in para.split(' '):
            candidate=(out+' '+word).strip()
            if pdfmetrics.stringWidth(candidate,font,size)>w and out:wrapped.append(out);out=word
            else:out=candidate
        wrapped.append(out)
    actual=len(wrapped)*size*leading
    assert actual<=h+2,(len(slides),value,actual,h)
    s['elements'].append(dict(kind='text',text='\n'.join(wrapped),x=x,y=y,w=w,h=h,size=size,color=C.get(color,color),font=font,leading=leading,align=align,url=url))
def card(s,x,y,w,h,label,heading,body,dark=False):
    rect(s,x,y,w,h,'navy' if dark else 'white',None,16)
    text(s,label,x+28,y+27,w-56,30,18,'mint' if dark else 'teal',bold=True)
    text(s,heading,x+28,y+79,w-56,110,36,'white' if dark else 'navy',font='display',leading=1.14)
    text(s,body,x+28,y+207,w-56,h-226,25,'soft' if dark else 'muted')
def pill(s,value,x,y,w,dark=False):
    rect(s,x,y,w,43,'teal' if dark else 'mint',None,21)
    text(s,value,x+14,y+9,w-28,27,18,'white' if dark else 'navy',bold=True,align='center')
def step(s,n,heading,body,x,y,w=266):
    circle(s,x+27,y+27,27,'teal')
    text(s,str(n),x+3,y+7,48,43,28,'white',bold=True,align='center')
    text(s,heading,x,y+91,w,72,33,'navy',font='display',leading=1.1)
    text(s,body,x,y+182,w,158,25,'muted')

# 01 — purpose and both direct links
s=slide('du × Ignyte challenge  ·  ResilienceTech','',True,notes='Aqion Relay helps a non-perishable goods distributor compare recovery purchases against an owner-defined cash floor. The public MVP uses fictional SME and supplier data. It trains a numerical forecast, evaluates feasible alternatives and saves an unsent draft only after owner confirmation. No order is sent and no funds move. The two cover links take judges directly to the public source and the verified live demonstration.',refs='S01 · S08')
text(s,'Aqion Relay',80,157,1000,95,76,'mint',font='display')
text(s,'Recover supply.\nProtect operating cash.',80,285,1040,210,78,'white',font='display',leading=1.08)
text(s,'A practical recovery copilot for UAE SME distributors.',84,538,1000,64,32,'soft')
text(s,'LIVE MVP',84,642,160,30,18,'mint',bold=True)
mvp=CFG.get('mvp') or 'DEPLOYMENT URL — INTERNAL PLACEHOLDER'
text(s,mvp,84,681,1390,42,27,'white',url=CFG.get('mvp'))
text(s,'GITHUB SOURCE',84,739,190,30,18,'mint',bold=True)
text(s,CFG['github'],300,734,1210,42,24,'white',url=CFG['github'])
for i,(yy,fill) in enumerate([(160,'teal'),(260,'mint'),(360,'teal')]):
    rect(s,1362,yy,140,56,fill,None,14)
    if i<2:line(s,1432,yy+56,1432,yy+100,'soft',3)

# 02 — specific operational tension
s=slide('The problem','A shipment slips.\nTwo commitments collide.',notes='The initial segment is non-perishable packaging and general trading distributors. Relay starts with one SKU and a 30-day view. A delayed inbound shipment threatens fulfilment while a replacement order competes for cash reserved for existing obligations. This is the operational decision we will validate with consenting SMEs, not a claim of completed customer research.',foot='Initial wedge: non-perishable packaging and general trading distributors; one SKU over 30 days.')
card(s,80,330,695,363,'CUSTOMER COMMITMENT','Keep customer\norders moving','A delayed inbound shipment creates an immediate gap in stock availability.')
card(s,805,330,715,363,'CASH COMMITMENT','Keep the business\noperating','A replacement purchase must leave room for existing payments and the owner’s cash floor.',True)
text(s,'Which recovery purchase is feasible — and worth approving?',80,720,1440,49,33,'teal',bold=True)

# 03 — track and differentiated slice
s=slide('Why ResilienceTech','One focused decision.\nA strong fit with existing SME tools.',notes='We selected the ResilienceTech track. Inventory tools already support replenishment and purchase orders. Relay focuses on the decision between disruption and approved action: compare supply recovery under a daily cash constraint, then retain source-bound evidence. This complements existing systems. It is not a claim that the combination is globally unique. Liquidity finance is not the initial execution scope; Relay does not move funds.',refs='S01 · S04 · S05')
for x,label,heading,body in [(80,'01  /  RELEVANT','Disruption to decision','Stress-test shipment delay, demand and freight in one owner workflow.'),(570,'02  /  COMPLEMENTARY','Works beside the ERP','Read a normalized snapshot; return a reviewable recovery draft.'),(1060,'03  /  DISTINCTIVE FOCUS','Cash-aware recovery','Compare service impact and minimum daily cash before approval.')]:card(s,x,330,460,393,label,heading,body)
text(s,'Positioning: a recovery decision layer for the tools SMEs already use.',80,748,1440,43,28,'teal',bold=True)

# 04 — workflow, rather than feature inventory
s=slide('The owner workflow','From disruption to an auditable draft.',notes='The current MVP supports this complete sequence with synthetic records. The owner selects a fictional SME, adjusts the disruption, runs the scenario and compares stock and cash. A review dialog shows supplier quantities, costs and terms. Explicit confirmation creates an unsent synthetic draft. Approval rechecks the current snapshot, calculation version and constraints; duplicates return the existing result.',refs='S08',foot='Every saved draft is bound to the reviewed source and scenario. The public MVP sends no order or payment.')
for i,(head,body) in enumerate([('Read','Stock, sales, scheduled cash and supplier terms.'),('Stress-test','Delay, demand and freight under owner-set limits.'),('Compare','Fulfilment, stockouts, spend and daily cash.'),('Review','Quantities, source freshness and the cash floor.'),('Approve','Save an unsent draft and export its evidence.')]):
    x=80+i*294;step(s,i+1,head,body,x,340,250)
    if i<4:line(s,x+70,367,x+269,367,'line',3)

# 05 — hard synthetic evidence, visibly distinct from targets
s=slide('Measured synthetic result','A recovery choice you can inspect.',notes='Reference fixture: packaging SME; shipment delay 7 days; demand increase 20%; freight increase 25%; cash floor AED 24,000. The model evaluates 130 combinations including baseline. Baseline fulfilment is 990 of 1,362 projected units with 9 stockout days. The recommended evaluated order is 400 units from fictional Oasis, arriving on day 4. It costs AED 7,887.50 including fictional VAT-inclusive item price and adjusted freight. It fulfils 1,362 projected units with zero stockout days and minimum projected cash AED 28,112.50. These are model outputs on fiction, not measured customer gains. Model assumptions include prepaid original inbound stock, recovery paid on day 1, scheduled receipts only and obligations before same-day receipts.',refs='S08',foot='Synthetic packaging fixture · 7-day delay · demand +20% · freight +25% · 130 evaluated combinations')
pill(s,'SYNTHETIC SIMULATION',80,294,284)
text(s,'PROJECTED UNITS FULFILLED',80,374,720,32,20,'muted',bold=True)
text(s,'Wait',80,437,150,42,28,'muted');rect(s,250,435,575*990/1362,47,'soft',None,6);text(s,'990',850,434,190,55,35,'muted',bold=True)
text(s,'Recover',80,528,150,42,28,'teal',bold=True);rect(s,250,527,575,47,'teal',None,6);text(s,'1,362',850,526,190,55,35,'teal',bold=True)
text(s,'372 additional units served in this scenario',80,638,910,60,36,'navy',font='display')
rect(s,1060,293,460,430,'navy',None,18)
text(s,'RECOVERY PURCHASE',1095,327,390,31,18,'mint',bold=True)
text(s,'AED 7,887.50',1095,379,390,70,48,'white',font='display')
text(s,'400 units · arrival day 4',1095,467,390,43,27,'soft')
line(s,1095,532,1485,532,'soft',1)
text(s,'AED 28,112.50',1095,557,390,62,42,'mint',font='display')
text(s,'minimum cash vs AED 24,000 floor',1095,633,390,57,23,'soft')

# 06 — precise AI boundary with actual fitted model
s=slide('Technology that earns trust','Forecast numerically.\nDecide within hard constraints.',notes='The forecast fits weekday and trend ridge regression to fictional fulfilled-sales history, comparing the last 14 days against a seasonal-naive baseline; it chooses the lower synthetic holdout-error method and refits as applicable. Short or constant histories use a labelled trailing-average fallback. The same holdout is used for model selection, so it is not an independent final quality test. Fulfilled sales may censor true demand. Candidate quantities obey approved-supplier status, quote expiry, MOQ, pack size, cap and lead time. Enumeration is bounded, at most 8,000 combinations in the current three-supplier slice, not a proof of a global optimum. Deterministic templates explain the calculation; no live generative model decides purchases.',refs='S08',foot='Forecast output informs a scenario; constraint checks and explicit owner approval control the action.')
card(s,80,330,460,392,'01  /  FITTED ML','Forecast with a\nvisible comparator','Weekday + trend ridge regression versus seasonal naive; labelled fallback for sparse history.')
card(s,570,330,460,392,'02  /  NUMERICAL ENGINE','Simulate stock\nand daily cash','Bounded supplier combinations. MOQ, pack, cap, lead time, quote validity and cash floor.')
card(s,1060,330,460,392,'03  /  HUMAN AUTHORITY','Explain, review\nand confirm','Traceable assumptions and version checks. The owner confirms the unsent recovery draft.',True)

# 07 — implementation evidence without brittle test-count claims
s=slide('Working MVP','A mobile workbench,\nwith a complete decision trail.',notes='The implemented web MVP offers Overview, Evidence, Connections and Pilot views. It supports scenario controls, stock/cash charts, a 30-day data table, owner review, saved unsent drafts, cancellation, synthetic JSON import/export and per-SME reset. Anonymous browser sessions isolate demonstration workspaces. This is not enterprise identity. The running Cloudflare app is verified separately through the live cover link. Mobile and automated validation evidence is retained with the repository; exact test counts belong to current CI, not an evergreen claim on this slide.',refs='S08')
rect(s,80,327,530,406,'navy',None,20)
image(s,'assets/live-mvp.png',90,343,510,354)
text(s,'Live Cloudflare MVP · synthetic scenario',105,748,600,30,18,'muted')
for y,num,head,body in [(330,'01','Compare clearly','Stock and cash curves, daily data and feasible options.'),(471,'02','Review deliberately','Confirmation, stale-source blocks and duplicate protection.'),(612,'03','Keep the evidence','Persisted drafts, readable audit history and portable JSON.')]:
    text(s,num,695,y,80,50,33,'teal',font='display');text(s,head,800,y,700,48,32,'navy',bold=True);text(s,body,800,y+59,700,75,25,'muted')

# 08 — Cloudflare current architecture
s=slide('Cloudflare MVP architecture','One deployment.\nPersistent, isolated demo workspaces.',notes='The production deployment uses a static-export Next.js/React frontend served as Cloudflare Worker assets. The API, numerical engine and domain services run inside a native SQLite-backed Durable Object, using transactionSync for atomic draft, audit and version checks. Signed anonymous sessions, same-origin/CSRF controls and bounded inputs guard the public synthetic workflow. A workspace transaction preserves approval and audit integrity. This is not enterprise tenant IAM; the production-pilot roadmap adds authenticated roles, approved processing/data location, connector credentials and operational restore acceptance. No local filesystem database or Hostinger/MySQL service is required for the Cloudflare release.',refs='S06 · S07 · S08',foot='Live scope: synthetic data and unsent drafts. Enterprise identity, ERP credentials and live writes enter through pilot gates.')
for x,w,label,head,body in [(80,400,'MOBILE WEB','Next / React UI','Responsive workbench\nAccessible table alternative'),(600,400,'CLOUDFLARE WORKER','Assets + API routing','Serve the React workbench\nRoute the workspace request'),(1120,400,'DURABLE OBJECT','Engine + SQLite','Forecast, simulate, approve\nAtomic state + draft + audit')]:
    rect(s,x,345,w,270,'white',None,16);text(s,label,x+27,375,w-54,35,18,'teal',bold=True);text(s,head,x+27,438,w-54,67,34,'navy',font='display');text(s,body,x+27,525,w-54,76,24,'muted')
line(s,480,475,585,475,'teal',4);line(s,1000,475,1105,475,'teal',4)
for i,value in enumerate(['Signed session + CSRF','Bounded input + safe errors','Version-bound approval','Human confirmation']):pill(s,value,80+i*368,679,335)

# 09 — technology integration roadmap
s=slide('Technology integration roadmap','Read first. Reconcile every write.\nThen expand through du.',notes='Proposed eight-week integration preparation, with responsibilities and acceptance gates. Weeks 1–2: AqionLabs maps consented snapshots, SME owners verify terms and the du sponsor approves scope; gate is required-field coverage and approved processing/security design. Weeks 3–4: AqionLabs builds a scoped read-only Zoho adapter using organization and region context; reconcile normalized snapshot against source totals and handle event IDs/revisions. Weeks 5–6: add owner-authorized ERP drafts with idempotency/outbox and reconciliation, sandbox-tested; ambiguous writes remain pending reconciliation. Weeks 7–8: configure sponsor-agreed du identity/billing/distribution interfaces and operational monitoring; no du interface is claimed connected. Each period starts when its dependencies are approved. Pilot comparison begins only after acceptance. Odoo is a subsequent adapter subject to exact version/plan, not a prerequisite for the first pilot.',refs='S05 · S09')
data=[('WEEKS 1–2','Map + authorize','Consented snapshots,\nterms and source IDs','Gate: data + security sign-off'),('WEEKS 3–4','Connect read-only','Zoho stock, sales and\nscheduled cash mapping','Gate: source reconciliation'),('WEEKS 5–6','Draft + reconcile','Owner approval, ERP\noutbox and idempotency','Gate: sandbox failure tests'),('WEEKS 7–8','Enable distribution','Agreed du interfaces,\nsupport and monitoring','Gate: sponsor acceptance')]
for i,(period,head,body,gate) in enumerate(data):
    x=80+i*368;rect(s,x,337,335,381,'white',None,16);text(s,period,x+25,367,285,34,19,'teal',bold=True);text(s,head,x+25,434,285,90,34,'navy',font='display');text(s,body,x+25,548,285,95,25,'muted');text(s,gate,x+25,661,285,43,20,'teal',bold=True)
text(s,'Accountability: AqionLabs builds · SME owner validates · du sponsors integration and acceptance',80,750,1440,42,25,'navy',bold=True)

# 10 — 160 SMEs with executable wave calendar
s=slide('Pilot execution plan','160 SMEs. Four waves.\nA credible comparison.',notes='Proposed enrollment: 160 consenting non-perishable-goods distributors; at least 150 enrolled before intervention. du sponsors recruitment; AqionLabs operates onboarding, support and analysis; an evaluation lead preregisters outcomes and completes power/MDE analysis before intervention. Four waves of 40 start in pilot weeks 1,2,3,4. Each receives two common baseline weeks then six comparison weeks; within each wave and sector/size/ERP strata, randomize 20 immediate and 20 delayed-access SMEs. The last comparison ends in week 11, analysis occurs in week 12. Delayed access follows its comparison window. Enrollment begins after the integration and operational acceptance gates, not during an unsafe live-write trial. Record screened, enrolled, randomized, activated, completed, withdrawn and missing-data counts; do not replace dropouts after randomization. A 160-SME feasibility cohort alone does not establish statistical power.',refs='S01 · S09',foot='Proposed 12-week pilot after integration acceptance · enrollment minimum 150 · SME is the randomization unit')
rect(s,80,326,363,411,'navy',None,18);text(s,'160',111,359,300,137,112,'mint',font='display');text(s,'Enrollment target',111,529,295,60,32,'white',font='display');text(s,'4 × 40\n20 immediate +\n20 delayed per wave',111,614,290,105,25,'soft')
sx=655;cw=63
for week in range(1,13):text(s,str(week),sx+(week-1)*cw,331,cw,30,18,'muted',align='center')
for wave in range(4):
    y=405+wave*76;text(s,f'Wave {wave+1}',485,y+12,160,40,24,'navy',bold=True)
    rect(s,sx+wave*cw,y,cw*2-4,48,'soft',None,6);rect(s,sx+(wave+2)*cw,y,cw*6-4,48,'teal',None,6)
    text(s,'2w',sx+wave*cw,y+9,cw*2-4,30,20,'navy',align='center',bold=True)
    text(s,'6-week comparison',sx+(wave+2)*cw,y+9,cw*6-4,30,20,'white',align='center',bold=True)
pill(s,'Common baseline',485,739,245);pill(s,'Immediate vs delayed access',755,739,370);pill(s,'Week 12 analysis',1150,739,275)

# 11 — measurable targets in explicit target language
s=slide('Pilot scorecard  ·  targets','Measure better decisions.\nKeep operational guardrails absolute.',notes='All percentages on this slide are prospective pilot targets, not achieved customer outcomes. Primary outcome: time from equivalent disruption brief to owner-approved plan that passes a predetermined blinded feasibility rubric. Use baseline-adjusted log-time comparison with SME assignment, wave/calendar and strata; report effect and 95% interval plus raw medians. Include non-completion under a preregistered capped-time rule with sensitivity analysis. Target 40% shorter time. Secondary feasibility target: at least 90% rubric-passing approved plans, all assigned drills in denominator. Adoption target: 70% of SMEs with access review at least one scenario per week, reporting opportunity and reasons for non-use. Exploratory stockout target is 15% reduction, reported separately with uncertainty and no causal before/after shortcut. Zero projected floor breaches, unauthorized external writes and duplicate external effects are stop rules for the later live pilot, not claims that predicted cash guarantees actual cash. Monitor source completeness and reconciliation latency. Independent baseline variance/power analysis determines whether efficacy or feasibility interpretation is justified.',refs='S09',foot='Pilot targets, not measured benefits. Pre-register analysis; report effect sizes, confidence intervals, attrition and deviations.')
for x,val,head,body in [(80,'40%','Faster feasible planning','Primary target: common disruption drill to owner-approved, rubric-passing plan.'),(570,'90%','Feasible-plan rate','Target share of assigned drills with an approved plan passing blinded scoring.'),(1060,'70%','Weekly workflow use','Target share of SMEs with access reviewing at least one scenario each week.')]:
    rect(s,x,332,460,357,'white',None,16);text(s,val,x+28,358,404,104,79,'teal',font='display');text(s,head,x+28,495,404,66,31,'navy',bold=True);text(s,body,x+28,579,404,95,24,'muted')
rect(s,80,717,1440,54,'mint',None,9);text(s,'STOP RULES   /   Projected cash-floor breach · unauthorized write · duplicate external effect',103,731,1390,31,23,'navy',bold=True)

# 12 — growth and economics without fabricated price
s=slide('Scale and commercial model','A narrow wedge.\nA repeatable route through du.',notes='Commercial proposal: a per-SME subscription distributed through du, with connector onboarding and service scope agreed before offer. No price, revenue, customer count or commercial commitment is claimed. Measure onboarding time, weekly use, support minutes and total cost per active SME in the pilot; scale only within a sponsor-approved unit-cost ceiling. Engineering scale path: 160-SME pilot, a 1,000-SME controlled rollout, then load/isolation/restore acceptance for the 40,000+ ambition. An illustrative engineering envelope assumes 1,000 normalized events and four scenarios per SME per day: 40m events/day at 40,000 SMEs, 463 average events/s, 4,630/s at ten-times peak, and 160,000 scenarios/day (1.85 average/s). These are arithmetic assumptions, not measured capacity. Proposed service targets such as p95 scenario latency <5s, availability 99.9%, RPO<=15m and RTO<=4h require sponsor agreement and separate acceptance tests; they are not current contractual SLAs.',refs='S02 · S03',foot='Scale sequence and subscription are proposals. Expansion follows measured adoption, unit cost, isolation and recovery acceptance.')
for i,(num,head,body) in enumerate([('160','Pilot cohort target','Validate decision value, source quality and support demand.'),('1,000','Controlled rollout','Standardize connectors and onboarding; enforce cost limits.'),('40,000+','Scale ambition','Partition workloads; prove peak load, isolation and restore.')]):
    x=80+i*490;rect(s,x,332,460,310,'white',None,16);text(s,num,x+28,358,404,93,68,'teal',font='display');text(s,head,x+28,470,404,55,31,'navy',bold=True);text(s,body,x+28,546,404,90,24,'muted')
text(s,'Commercial offer',80,696,350,45,32,'navy',font='display');text(s,'Per-SME subscription + agreed connector onboarding, distributed through du.',460,697,1060,70,27,'muted')

# 13 — practical controls avoid legal boilerplate but do not claim certification
s=slide('Delivery controls','Make the safe action\nthe easiest action.',notes='Current synthetic MVP controls include validation, source-age and quote checks, scenario/version binding, signed anonymous sessions, same-origin/CSRF checks, bounded input, persistent draft/audit transactions, human confirmation and duplicate protection. These do not constitute enterprise acceptance. Pilot release gates add tenant IAM/roles, approved processing and data location, scoped connector secrets, encryption and restore testing, ERP outbox/reconciliation and incident ownership. Daily monitoring reviews source lag, invalid fields, rejected approvals, write ambiguity and reconciliation age. A material floor/authorization/duplicate violation pauses writes; the operator investigates and the sponsor approves resumption. Forecast error is monitored against naive baseline, sparse histories fall back visibly. No autonomous buying or funds movement is included.',refs='S06 · S08 · S09')
rows=[('Input quality','Freshness, required fields and valid supplier terms','Block stale or incomplete approval'),('Execution integrity','Human confirmation, version checks and idempotency','ERP outbox + reconciliation gate'),('Data protection','Isolated demo state; signed session + CSRF','Pilot IAM, approved processing and restore test'),('Model reliability','Comparator, fallback and visible assumptions','Monitor forecast error and rejected scenarios')]
for i,(risk,control,gate) in enumerate(rows):
    y=325+i*105;rect(s,80,y,1440,87,'white',None,12);text(s,risk,107,y+20,310,51,28,'navy',bold=True);text(s,control,450,y+19,588,58,24,'muted');text(s,gate,1085,y+20,407,58,23,'teal',bold=True)
text(s,'Accountable operations: monitor exceptions · pause writes on a material breach · reconcile before resuming',80,768,1440,48,23,'navy',bold=True)

# 14 — decisive ask, no outdated eligibility/deadline prose
s=slide('The ask','Launch the du recovery pilot.',True,notes='We seek a du sponsor, recruitment of 160 consenting eligible SMEs with at least 150 enrolled before intervention, technical owners for approved read-only and draft interfaces, and a joint evaluation lead. AqionLabs delivers the working MVP, phased connector engineering, onboarding and pilot evidence. Before pilot week 1, agree success thresholds, processing/security controls, support ownership and the cost ceiling. This is a concrete pilot proposal, not a claim of customers, commercial acceptance, production certification or submitted application. Close by opening the live MVP and showing the default scenario, then the explicit unsent draft review.',refs='S01 · S09',foot='Aqion Relay  /  Recover supply. Protect operating cash.')
text(s,'A working product.\nA measurable pilot.\nA clear path to SME scale.',80,318,820,225,61,'white',font='display',leading=1.15)
for i,(head,body) in enumerate([('Sponsor + recruit','160 consenting SMEs; minimum 150 enrolled.'),('Connect + operate','Named du technical owners and approved interfaces.'),('Evaluate + expand','Joint scorecard, delivery gates and cost ceiling.')]):
    y=330+i*139;text(s,f'0{i+1}',1035,y,68,48,30,'mint',font='display');text(s,head,1130,y,370,45,30,'white',bold=True);text(s,body,1130,y+55,370,77,24,'soft')
pill(s,'NEXT MILESTONE  /  Pilot charter + named owners',80,673,768,True)

scene={'width':W,'height':H,'config':CFG,'slides':slides}
(ROOT/'scene.json').write_text(json.dumps(scene,ensure_ascii=False,indent=2))
(ROOT/'CONTENT.md').write_text('# Aqion Relay — slide source and speaker notes\n\n'+ '\n\n'.join(f"## {i+1:02} — {(s['title'] or 'Aqion Relay').replace(chr(10),' ')}\n\n"+'\n\n'.join(e['text'] for e in s['elements'] if e['kind']=='text' and e['size']>=23)+f"\n\n**Speaker notes**\n\n{s['notes']}\n\nSources: {s['refs'] or 'Product proposition / proposed operating plan'}" for i,s in enumerate(slides)))

# Searchable PDF with embedded fonts and actual link annotations.
pdf=canvas.Canvas(str(ROOT/'Aqion-Relay-Du-Ignyte-Pitch.pdf'),pagesize=(W*.6,H*.6),pageCompression=1)
pdf.setTitle('Aqion Relay | du × Ignyte | ResilienceTech')
pdf.setAuthor('AqionLabs')
for s in slides:
    pdf.saveState();pdf.scale(.6,.6)
    for e in s['elements']:
        if e['kind']=='rect':
            pdf.setFillColor(HexColor('#'+e['fill']));pdf.setStrokeColor(HexColor('#'+(e['stroke'] or e['fill'])))
            pdf.roundRect(e['x'],H-e['y']-e['h'],e['w'],e['h'],e['r'],fill=1,stroke=bool(e['stroke']))
        elif e['kind']=='circle':
            pdf.setFillColor(HexColor('#'+e['fill']));pdf.circle(e['x'],H-e['y'],e['r'],fill=1,stroke=0)
        elif e['kind']=='line':
            pdf.setStrokeColor(HexColor('#'+e['color']));pdf.setLineWidth(e['width']);pdf.line(e['x'],H-e['y'],e['x2'],H-e['y2'])
        elif e['kind']=='text':
            pdf.setFillColor(HexColor('#'+e['color']));pdf.setFont(e['font'],e['size'])
            for i,ln in enumerate(e['text'].split('\n')):
                y=H-e['y']-e['size']*.94-i*e['size']*e['leading']
                if e['align']=='right':pdf.drawRightString(e['x']+e['w'],y,ln)
                elif e['align']=='center':pdf.drawCentredString(e['x']+e['w']/2,y,ln)
                else:pdf.drawString(e['x'],y,ln)
            if e.get('url'):pdf.linkURL(e['url'],(e['x'],H-e['y']-e['h'],e['x']+e['w'],H-e['y']),relative=1,thickness=0)
        elif e['kind']=='image':
            pdf.drawImage(ImageReader(str(ROOT/e['file'])),e['x'],H-e['y']-e['h'],e['w'],e['h'],preserveAspectRatio=True,anchor='c',mask='auto')
    pdf.restoreState();pdf.showPage()
pdf.save()
print(json.dumps({'slides':len(slides),'textObjects':sum(e['kind']=='text' for s in slides for e in s['elements']),'urlFinalized':bool(CFG.get('mvp')),'pdf':str(ROOT/'Aqion-Relay-Du-Ignyte-Pitch.pdf')}))
