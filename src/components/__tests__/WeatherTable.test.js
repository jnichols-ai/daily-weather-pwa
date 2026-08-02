// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, within } from "@testing-library/react";
import WeatherTable from "../WeatherTable";

function jsonResponse(data) {
  return { json: async () => data };
}

// The component debounces filter-driven refetches by 300ms via setTimeout;
// real timers are simpler and more reliable here than fighting fake-timer/
// async interleaving, at the cost of a bit of real wall-clock time per test.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const richmond = {
  id: "1",
  address: "Richmond, VA",
  tempF: "90",
  condition: "Sunny",
  windMph: "5",
  heatIndexF: "95", // caution
  observedAt: "2026-07-31 09:00",
};

const bowie = {
  id: "2",
  address: "Bowie, MD",
  tempF: "100",
  condition: "Hot",
  windMph: "8",
  heatIndexF: "110", // danger
  observedAt: "2026-07-31 14:00",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ rows: [richmond, bowie], total: 2 })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WeatherTable", () => {
  it("fetches history on mount and renders rows sorted by observedAt descending", async () => {
    render(<WeatherTable />);

    await screen.findByText("Showing 2 of 2 logged readings");

    const dataRows = screen.getAllByRole("row").slice(1);
    expect(within(dataRows[0]).getByText(/Bowie, MD/)).toBeInTheDocument();
    expect(within(dataRows[1]).getByText(/Richmond, VA/)).toBeInTheDocument();
  });

  it("issues a second debounced fetch shortly after mount (the state/date effect also fires on mount)", async () => {
    render(<WeatherTable />);
    await screen.findByText(/Showing/);
    await wait(350);

    // Documents existing behavior: both the mount effect and the
    // state/date-watching effect fire on initial mount, so the app
    // currently double-fetches on load even with no user interaction.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("requests the state and date filters together after the debounce window", async () => {
    render(<WeatherTable />);
    await screen.findByText(/Showing/);
    await wait(350);
    fetch.mockClear();

    const [stateSelect] = screen.getAllByRole("combobox");
    fireEvent.change(stateSelect, { target: { value: "VA" } });
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: "2026-07-31" } });

    await wait(350);

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("state=VA");
    expect(url).toContain("date=2026-07-31");
  });

  it("applies the city search and severity filters client-side without refetching", async () => {
    render(<WeatherTable />);
    await screen.findByText("Showing 2 of 2 logged readings");
    await wait(350);
    const callsAfterMount = fetch.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText("Search city…"), { target: { value: "richmond" } });
    await screen.findByText("Showing 1 of 2 logged readings");
    expect(screen.getByText(/Richmond, VA/)).toBeInTheDocument();
    expect(screen.queryByText(/Bowie, MD/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search city…"), { target: { value: "" } });
    const severitySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(severitySelect, { target: { value: "danger" } });
    await screen.findByText("Showing 1 of 2 logged readings");
    expect(screen.getByText(/Bowie, MD/)).toBeInTheDocument();
    expect(screen.queryByText(/Richmond, VA/)).not.toBeInTheDocument();

    expect(fetch).toHaveBeenCalledTimes(callsAfterMount);
  });

  it("renders em-dash fallbacks for rows with missing fields", async () => {
    fetch.mockResolvedValue(jsonResponse({ rows: [{ id: "3", address: "Dover, DE" }], total: 1 }));

    render(<WeatherTable />);
    await screen.findByText("Showing 1 of 1 logged readings");

    const dataRow = screen.getAllByRole("row")[1];
    expect(within(dataRow).getAllByText(/^—/).length).toBeGreaterThan(1);
  });

  it("shows the API error message when the response contains one", async () => {
    fetch.mockResolvedValue(jsonResponse({ error: "monday API error" }));

    render(<WeatherTable />);

    await screen.findByText(/monday API error/);
  });

  it("resets all filters when Clear filters is clicked", async () => {
    render(<WeatherTable />);
    await screen.findByText(/Showing/);
    await wait(350);

    const [stateSelect] = screen.getAllByRole("combobox");
    fireEvent.change(stateSelect, { target: { value: "VA" } });
    fireEvent.change(screen.getByPlaceholderText("Search city…"), { target: { value: "richmond" } });

    fireEvent.click(screen.getByText("Clear filters"));

    expect(stateSelect.value).toBe("");
    expect(screen.getByPlaceholderText("Search city…").value).toBe("");
  });
});
