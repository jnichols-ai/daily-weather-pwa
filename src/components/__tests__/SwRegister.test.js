// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import SwRegister from "../SwRegister";

afterEach(cleanup);

describe("SwRegister", () => {
  it("renders nothing", () => {
    const { container } = render(<SwRegister />);
    expect(container).toBeEmptyDOMElement();
  });

  it("registers the service worker when supported", async () => {
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    render(<SwRegister />);

    await vi.waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js"));

    vi.unstubAllGlobals();
  });

  it("does not throw when serviceWorker is unsupported", () => {
    // jsdom doesn't implement the Service Worker API, so this is already the
    // default environment here — asserting it explicitly documents the guard.
    expect("serviceWorker" in navigator).toBe(false);
    expect(() => render(<SwRegister />)).not.toThrow();
  });
});
