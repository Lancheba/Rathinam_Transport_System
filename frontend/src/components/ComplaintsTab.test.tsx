import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComplaintsTab } from "./ComplaintsTab";
import api from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn() },
}));

describe("ComplaintsTab", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("shows a loading state before the first fetch resolves", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {})); // never resolves
    render(<ComplaintsTab unreadCount={0} />);
    expect(screen.getByText(/loading complaints/i)).toBeInTheDocument();
  });

  it("shows a friendly empty state when there are no new complaints", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });
    render(<ComplaintsTab unreadCount={0} />);
    expect(await screen.findByText(/no new complaints/i)).toBeInTheDocument();
  });

  it("renders each complaint's subject, kind/category, and named author", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 1, kind: "Complaint", category: "Bus Delay", subject: "Bus 12 late again",
          created_at: "2026-01-01", author_role: "Student", is_anonymous: false,
        },
      ],
    });
    render(<ComplaintsTab unreadCount={0} />);

    expect(await screen.findByText("Bus 12 late again")).toBeInTheDocument();
    expect(screen.getByText(/Complaint · Bus Delay · Student/)).toBeInTheDocument();
  });

  it("labels an anonymous submission as Anonymous instead of its author role", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 2, kind: "Feedback", category: "Driving", subject: "Great driving today",
          created_at: "2026-01-01", author_role: "Student", is_anonymous: true,
        },
      ],
    });
    render(<ComplaintsTab unreadCount={0} />);

    expect(await screen.findByText("Great driving today")).toBeInTheDocument();
    expect(screen.getByText(/Feedback · Driving · Anonymous/)).toBeInTheDocument();
  });

  it("unwraps a paginated {results: [...]} response the same as a bare array", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 3, kind: "Complaint", category: "Parking", subject: "Slot blocked",
            created_at: "2026-01-01", author_role: "Staff", is_anonymous: false,
          },
        ],
      },
    });
    render(<ComplaintsTab unreadCount={0} />);
    expect(await screen.findByText("Slot blocked")).toBeInTheDocument();
  });

  it("re-fetches when unreadCount changes", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    const { rerender } = render(<ComplaintsTab unreadCount={0} />);
    await screen.findByText(/no new complaints/i);
    expect(api.get).toHaveBeenCalledTimes(1);

    rerender(<ComplaintsTab unreadCount={1} />);
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});
