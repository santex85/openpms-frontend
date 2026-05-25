import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useBookingsUnpaidFolio } from "@/hooks/useBookingsUnpaidFolio";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { usePropertyStore } from "@/stores/property-store";
import { DashboardPage } from "./DashboardPage";

// Mock the custom react-query hooks
vi.mock("@/hooks/useDashboardSummary", () => ({
  useDashboardSummary: vi.fn(),
}));

vi.mock("@/hooks/useBookingsUnpaidFolio", () => ({
  useBookingsUnpaidFolio: vi.fn(),
}));

vi.mock("@/hooks/useAvailabilityGrid", () => ({
  useAvailabilityGrid: vi.fn(),
}));

describe("DashboardPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to a selected property
    usePropertyStore.getState().setSelectedPropertyId("test-property-uuid");

    // Set default mock return values for hooks because they are called unconditionally at the top of DashboardPage
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: {
        arrivals_today: 0,
        departures_today: 0,
        occupied_rooms: 0,
        total_rooms: 0,
        dirty_rooms: 0,
        currency: "USD",
      },
      isPending: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(useBookingsUnpaidFolio).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(useAvailabilityGrid).mockReturnValue({
      data: {
        cells: [],
      },
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    // Reset Zustand store after each test
    usePropertyStore.getState().setSelectedPropertyId(null);
  });

  it("renders property selection warning when no property is selected", () => {
    usePropertyStore.getState().setSelectedPropertyId(null);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText("dashboard.selectProperty")).toBeInTheDocument();
  });

  it("renders pending / loading states correctly", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as any);

    vi.mocked(useBookingsUnpaidFolio).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as any);

    vi.mocked(useAvailabilityGrid).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as any);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Checks that KPI values are shown as loading indicators
    const loadingEllipses = screen.getAllByText("…");
    expect(loadingEllipses.length).toBeGreaterThanOrEqual(4);
  });

  it("renders full dashboard KPIs, unpaid folios table, and occupancy chart on happy path", () => {
    // Mock Dashboard Summary data
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: {
        arrivals_today: 5,
        departures_today: 3,
        occupied_rooms: 12,
        total_rooms: 30,
        dirty_rooms: 4,
        currency: "USD",
      },
      isPending: false,
      isError: false,
      error: null,
    } as any);

    // Mock Unpaid Folios table
    vi.mocked(useBookingsUnpaidFolio).mockReturnValue({
      data: [
        {
          booking_id: "book-uuid-1",
          guest_name: "alex guest",
          balance: "150.00",
        },
        {
          booking_id: "book-uuid-2",
          guest_name: "",
          balance: "75.50",
        },
      ],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    // Mock Availability Grid for the chart
    vi.mocked(useAvailabilityGrid).mockReturnValue({
      data: {
        cells: [
          {
            date: "2026-05-25",
            room_type_id: "rt-1",
            total_rooms: 10,
            booked_rooms: 4,
            blocked_rooms: 0,
          },
        ],
      },
      isPending: false,
      isError: false,
      error: null,
    } as any);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Verify Metric Cards
    expect(screen.getByText("dashboard.arrivalsToday")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("dashboard.departuresToday")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("dashboard.roomLoad")).toBeInTheDocument();
    expect(screen.getByText("12 / 30")).toBeInTheDocument();

    expect(screen.getByText("dashboard.dirtyRooms")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    // Verify Unpaid Table
    expect(screen.getByText("dashboard.unpaidTitle")).toBeInTheDocument();
    expect(screen.getByText("Alex Guest")).toBeInTheDocument(); // capitalized by utility
    expect(screen.getByText("common.notAvailable")).toBeInTheDocument(); // empty guest name fallback
    
    // Asserting balance with regex to avoid differences in locale currency prefixes (e.g. US$150.00 vs $150.00)
    expect(screen.getByText(/150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/75\.50/)).toBeInTheDocument();

    // Verify Chart presence
    expect(screen.getByText("dashboard.chartTitle")).toBeInTheDocument();
  });

  it("renders error fallbacks correctly when APIs fail", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Failed to load summary details"),
    } as any);

    vi.mocked(useBookingsUnpaidFolio).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Failed to fetch balances"),
    } as any);

    vi.mocked(useAvailabilityGrid).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Failed to load chart"),
    } as any);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Checks dashboard error fallbacks
    const errorHyphens = screen.getAllByText("—");
    expect(errorHyphens.length).toBeGreaterThanOrEqual(4); // KPI values fallback to hyphens

    expect(screen.getByText("dashboard.unpaidError")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch balances")).toBeInTheDocument();

    expect(screen.getByText("dashboard.chartError")).toBeInTheDocument();
  });
});
