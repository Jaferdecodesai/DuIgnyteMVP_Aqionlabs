// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import RelayApp from "../src/components/RelayApp";
import fixtures from "../src/lib/fixtures.json";
const snapshot = fixtures.packaging;
const daily = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  demand: 40,
  stock: 200 - i * 3,
  cash: 42000 - i * 100,
}));
const baseline = {
  id: "baseline",
  label: "Wait for shipment",
  fulfilled: 990,
  lost: 372,
  min_cash: 36000,
  spend: 0,
  stockout_days: 9,
  daily,
  orders: [],
  feasible: true,
  reasons: [],
};
const plan = {
  ...baseline,
  id: "plan1",
  label: "Balanced recovery",
  fulfilled: 1362,
  lost: 0,
  min_cash: 28112.5,
  spend: 7887.5,
  stockout_days: 0,
  orders: [
    {
      supplier_id: "local-fast",
      name: "Falcon Supply · fictional",
      qty: 220,
      lead: 2,
      unit_price: 23,
      freight: 250,
      cost: 5310,
    },
  ],
};
const proposal = {
  id: "P-test",
  created_at: Date.now() / 1000,
  version: "v1",
  scenario: { delay: 7, demand: 20, freight: 25, cash_floor: 24000 },
  baseline,
  plans: [plan],
  recommended_id: "plan1",
  evaluated: 40,
  blocked: [],
  forecast: {
    method: "local regression",
    holdout_mae: 2.1,
    baseline_mae: 3.2,
    uncertainty_note:
      "Synthetic data does not establish real-world performance",
  },
  assumptions: ["Inbound is prepaid."],
};
const state = {
  tenants: [
    { id: "packaging", name: snapshot.name },
    { id: "trading", name: "Cedar General Trading" },
  ],
  tenant: { id: "packaging", name: snapshot.name },
  snapshot,
  version: "v1",
  drafts: [],
  audit: [],
  mode: "synthetic",
  csrf: "csrf-test",
  writes_enabled: true,
  storage: "sqlite",
};
let fetcher: ReturnType<typeof vi.fn>;
function response(value: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.removeAttribute("open");
    },
  });
  fetcher = vi.fn((url: string) =>
    url.includes("/simulate") ? response(proposal) : response(state),
  );
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function ready() {
  render(<RelayApp />);
  await screen.findByRole("heading", { name: "Stay ahead of the disruption." });
}
test("shows synthetic workspace with explicitly disconnected integrations", async () => {
  await ready();
  expect(screen.getAllByText(/Synthetic demo/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Connections" }));
  expect(screen.getByText("No live connections")).toBeInTheDocument();
  expect(screen.getByLabelText("Import synthetic JSON")).toBeInTheDocument();
});
test("shows a loading state until the server responds", () => {
  fetcher.mockReturnValue(new Promise(() => {}));
  render(<RelayApp />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading your workspace",
  );
});
test("can retry an unavailable workspace", async () => {
  fetcher.mockRejectedValueOnce(new Error("offline"));
  render(<RelayApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "could not be reached",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Retry loading workspace" }),
  );
  await screen.findByRole("heading", { name: "Stay ahead of the disruption." });
});
test("optional demo access form creates session then loads workspace", async () => {
  fetcher.mockImplementationOnce(() =>
    response({ access_required: true, error: "Access code required" }, 401),
  );
  render(<RelayApp />);
  await screen.findByRole("heading", { name: "Open your demo workspace" });
  fireEvent.change(screen.getByLabelText("Demo access code"), {
    target: { value: "sample" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open workspace" }));
  await screen.findByRole("heading", { name: "Stay ahead of the disruption." });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/access",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ code: "sample" }),
    }),
  );
});
test("runs same-origin calculation and invalidates review when assumptions change", async () => {
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Run scenario" }));
  await screen.findByText("Balanced recovery");
  expect(fetcher).toHaveBeenCalledWith(
    "/api/simulate",
    expect.objectContaining({
      headers: expect.objectContaining({ "X-Relay-CSRF": "csrf-test" }),
    }),
  );
  expect(screen.getByRole("button", { name: "Review plan" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Shipment delay"), {
    target: { value: 8 },
  });
  expect(screen.getByRole("button", { name: "Review plan" })).toBeDisabled();
  expect(screen.getByText(/Controls changed/)).toBeInTheDocument();
});
test("requires explicit approval and records only an unsent draft", async () => {
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Run scenario" }));
  await screen.findByText("Balanced recovery");
  fireEvent.click(screen.getByRole("button", { name: "Review plan" }));
  const dialog = screen.getByRole("dialog", { name: "Review recovery plan" });
  expect(
    within(dialog).getByRole("button", { name: "Create unsent draft" }),
  ).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("checkbox"));
  fetcher.mockImplementation((url: string) =>
    url.includes("/approve")
      ? response({ draft: { id: "D-one" }, duplicate: false })
      : response({
          ...state,
          drafts: [
            {
              ...plan,
              id: "D-one",
              status: "local_draft_unsent",
              created_at: Date.now() / 1000,
            },
          ],
        }),
  );
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Create unsent draft" }),
  );
  await screen.findByText("D-one");
  expect(screen.getByRole("status")).toHaveTextContent(/unsent draft/);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/approve",
    expect.objectContaining({
      body: JSON.stringify({
        tenant: "packaging",
        proposal_id: "P-test",
        plan_id: "plan1",
        confirm: true,
      }),
    }),
  );
});
test("exposes the accessible daily table alongside forecast disclosures", async () => {
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Run scenario" }));
  await screen.findByText("Balanced recovery");
  fireEvent.click(screen.getByText("View 30-day data table"));
  expect(
    screen.getByRole("table", { name: "Daily projection values" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Local numerical forecast/)).toBeInTheDocument();
});
test("write-disabled mode prevents saving and importing while preserving calculation", async () => {
  fetcher.mockImplementation(() =>
    response({ ...state, writes_enabled: false }),
  );
  await ready();
  expect(screen.getByText(/Saving is paused/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Connections" }));
  expect(screen.getByLabelText("Import synthetic JSON")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Reset SME fixture" }),
  ).toBeDisabled();
});

test("cancels a saved draft and refreshes the recovery timeline", async () => {
  fetcher.mockImplementation(() =>
    response({
      ...state,
      drafts: [{ ...plan, id: "D-one", status: "local_draft_unsent" }],
      audit: [
        {
          action: "draft_saved",
          created_at: Date.now() / 1000,
          detail: "D-one",
        },
      ],
    }),
  );
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Evidence" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel unsent draft" }));
  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith(
      "/api/cancel",
      expect.objectContaining({
        body: JSON.stringify({ tenant: "packaging", draft_id: "D-one" }),
      }),
    ),
  );
});
test("reset requires a confirmation dialog", async () => {
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Connections" }));
  fireEvent.click(screen.getByRole("button", { name: "Reset SME fixture" }));
  const dialog = screen.getByRole("dialog", { name: "Reset this SME?" });
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Restore fictional fixture" }),
  );
  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith(
      "/api/reset",
      expect.objectContaining({
        body: JSON.stringify({ tenant: "packaging", confirm: true }),
      }),
    ),
  );
});
test("rejects malformed import without changing server state", async () => {
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Connections" }));
  const file = new File(["bad json"], "broken.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", { value: async () => "bad json" });
  fireEvent.change(screen.getByLabelText("Import synthetic JSON"), {
    target: { files: [file] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(/not valid JSON/);
  expect(
    fetcher.mock.calls.some((call) => String(call[0]).includes("/api/import")),
  ).toBe(false);
});
test("shows newest recovery actions first in readable business language", async () => {
  fetcher.mockImplementation(() =>
    response({
      ...state,
      audit: [
        {
          event: "local_draft_created",
          created_at: 2,
          detail: { draft_id: "D-new", spend: 7887.5 },
        },
        {
          event: "scenario_evaluated",
          created_at: 1,
          detail: { evaluated: 130, input_hash: "internal-hash" },
        },
      ],
    }),
  );
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Evidence" }));
  const timeline = screen.getByRole("list");
  expect(within(timeline).getAllByRole("listitem")[0]).toHaveTextContent(
    "Unsent draft created",
  );
  expect(
    within(timeline).getByText("130 recovery combinations evaluated."),
  ).toBeInTheDocument();
  expect(timeline).not.toHaveTextContent("internal-hash");
});
test("navigation opens the next view at the top with main content focused", async () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Pilot" }));
  expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  expect(document.activeElement).toBe(screen.getByRole("main"));
  scroll.mockRestore();
});
test("stale sources block owner review without calling a feasible plan impossible", async () => {
  fetcher.mockImplementation((url: string) =>
    url.includes("/simulate")
      ? response({
          ...proposal,
          recommended_id: null,
          blocked: ["Source older than 24 fictional hours."],
        })
      : response(state),
  );
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Run scenario" }));
  await screen.findByText("Balanced recovery");
  expect(screen.getByRole("button", { name: "Review plan" })).toBeDisabled();
  expect(
    screen.getByText(
      "No eligible recovery recommendation. Inspect the source and constraint reasons below.",
    ),
  ).toBeInTheDocument();
});
test("a cash-feasible option with no service improvement cannot be reviewed", async () => {
  fetcher.mockImplementation((url: string) =>
    url.includes("/simulate")
      ? response({
          ...proposal,
          recommended_id: null,
          plans: [{ ...plan, lost: 372 }],
        })
      : response(state),
  );
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Run scenario" }));
  await screen.findByText("Balanced recovery");
  expect(screen.getByRole("button", { name: "Review plan" })).toBeDisabled();
  expect(screen.getByText("NO IMPROVEMENT")).toBeInTheDocument();
});
