// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

const { mapMock } = vi.hoisted(() => ({ mapMock: { setView: vi.fn() } }));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ center, pathOptions, children }) => (
    <div data-testid="circle-marker" data-lat={center[0]} data-lng={center[1]} data-fill-color={pathOptions?.fillColor}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => mapMock,
}));

const { default: WeatherMap } = await import("../WeatherMap");

afterEach(() => {
  cleanup();
  mapMock.setView.mockClear();
});

const validRow = {
  id: "1",
  lat: 39.1582,
  lng: -75.5244,
  cityName: "Dover",
  stateName: "DE",
  tempF: "90",
  condition: "Sunny",
  windMph: "5",
  heatIndexF: "95",
  sevLabel: "Caution",
  sevDot: "#ca8a04",
  lastUpdated: "2026-07-31 14:00",
};

describe("WeatherMap", () => {
  it("renders a marker only for rows with valid numeric lat/lng", () => {
    const rows = [
      validRow,
      { ...validRow, id: "2", lat: null, lng: -75 },
      { ...validRow, id: "3", lat: NaN, lng: -75 },
      { ...validRow, id: "4", lat: 38, lng: undefined },
    ];

    render(<WeatherMap rows={rows} />);

    expect(screen.getAllByTestId("circle-marker")).toHaveLength(1);
  });

  it("handles a missing/empty rows array without throwing", () => {
    expect(() => render(<WeatherMap rows={undefined} />)).not.toThrow();
    expect(screen.queryByTestId("circle-marker")).not.toBeInTheDocument();
  });

  it("renders popup content with sensible fallbacks for missing fields", () => {
    render(<WeatherMap rows={[{ id: "1", lat: 1, lng: 2 }]} />);

    const popup = screen.getByTestId("popup");
    expect(popup).toHaveTextContent(/—°F/);
    expect(popup).toHaveTextContent(/— mph/);
  });

  it("renders full popup content for a complete row", () => {
    render(<WeatherMap rows={[validRow]} />);

    const popup = screen.getByTestId("popup");
    expect(popup).toHaveTextContent("Dover, DE");
    expect(popup).toHaveTextContent("90°F");
    expect(popup).toHaveTextContent("Sunny");
    expect(popup).toHaveTextContent("5 mph");
    expect(popup).toHaveTextContent("95°F (Caution)");
  });

  it("uses the row's severity dot color for the marker fill", () => {
    render(<WeatherMap rows={[validRow]} />);
    expect(screen.getByTestId("circle-marker")).toHaveAttribute("data-fill-color", "#ca8a04");
  });

  it("pans/zooms the map when focusTarget has coordinates", () => {
    const { rerender } = render(<WeatherMap rows={[]} focusTarget={null} />);
    expect(mapMock.setView).not.toHaveBeenCalled();

    rerender(<WeatherMap rows={[]} focusTarget={{ lat: 39.1582, lng: -75.5244, ts: 1 }} />);

    expect(mapMock.setView).toHaveBeenCalledWith([39.1582, -75.5244], 9, { animate: true });
  });

  it("does not call setView when focusTarget lacks coordinates", () => {
    render(<WeatherMap rows={[]} focusTarget={{ ts: 1 }} />);
    expect(mapMock.setView).not.toHaveBeenCalled();
  });
});
