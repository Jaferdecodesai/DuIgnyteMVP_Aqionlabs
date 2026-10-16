# Node web API

Same action/result structures as the prior synthetic prototype. Data are scoped by signed anonymous workspace cookie; there is no client-supplied workspace identifier. No account/customer authentication claim. Synthetic-only demonstration.

GET /api/state?tenant=packaging returns {tenants,tenant,snapshot,version,drafts,audit,mode,csrf,writes_enabled,storage}. Cookies created here if access code disabled. 401 + {access_required:true,error} if optional access code configured and no valid session. POST /api/access {code} creates signed cookie only when code matches; no code required in open demo mode. Response {ok:true}. POST /api/logout with CSRF clears session cookie without deleting saved data.

GET /api/export?tenant=packaging downloads evidence JSON. GET /api/health returns {status:'ok'|'unavailable',mode:'synthetic',storage:'sqlite'|'mysql',writes_enabled}; never secrets, session tokens, record counts or credentials. HTTP503 on invalid production config/DB failure. No session creation needed for health.

POST simulate/approve/cancel/import/reset body includes tenant as in previous contract, same-origin Origin and X-Relay-CSRF required. GET state supplies csrf. Cookies HttpOnly/SameSiteStrict/Secure in production, TTL7days. Mutations max256KiB, no caching. /access same-origin plus per-process throttle before DB/session creation. No query parameter may choose another workspace. Rate limits conservative local guard, not claimed distributed WAF.

Simulation response id P-..., created_at Unix seconds, original shape from oldAPI. Snapshot import increments import_revision and invalidates prior scenarios. Approved draft status local_draft_unsent remains supported but means saved in this demo, whether local or hosted; never external orders. Existing duplicate returns committed result even after cancellation, cannot resurrect. One outstanding draft per SME. State/proposal/audit bounded, no secrets in exports.

Writes can be disabled by RELAY_WRITES_ENABLED=false; scenario evaluation/reads/export remain available, approval/import/reset/cancel return503 with actionable explanation. Each workspace state {schema:1,tenants:{packaging:{snapshot,proposals:[],drafts:[],audit:[]},...}}. Storage saves complete document transactionally per workspace. Per workspace max100 undrafted proposals,200 audit events and200drafts. GET health includes configured storage only. Local SQLite is sole-process dev adapter. Hosted MySQL transaction locks the workspace row and commits draft+audit atomically. MYSQL_* config is runtime-only, not exposed to browser.

Imported snapshots are rebuilt from validated known fields: harmless unknown fields are stripped, while dangerous object keys are rejected. This is normalization rather than a promise to reject every additional JSON field. The body size and every persisted list/string/number are bounded.
