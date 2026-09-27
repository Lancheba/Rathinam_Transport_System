import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManualMarkSection from "./ManualMarkSection";
import api from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const rosterResponse = {
  data: {
    session_open: true,
    students: [
      { id: 1, name: "Alice Roy", roll_number: "R1", department: "CSE", status: "ABSENT", source: "" },
      { id: 2, name: "Bob Singh", roll_number: "R2", department: "ECE", status: "PRESENT", source: "MANUAL" },
    ],
  },
};

describe("ManualMarkSection", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockResolvedValue(rosterResponse);
  });

  it("fetches and displays today's roster on mount", async () => {
    render(<ManualMarkSection />);

    expect(api.get).toHaveBeenCalledWith("/attendance/qr/roster/");
    expect(await screen.findByText("Alice Roy")).toBeInTheDocument();
    expect(screen.getByText("Bob Singh")).toBeInTheDocument();
  });

  it("filters the roster list by search text", async () => {
    const user = userEvent.setup();
    render(<ManualMarkSection />);
    await screen.findByText("Alice Roy");

    await user.type(screen.getByPlaceholderText(/search by name/i), "bob");

    expect(screen.queryByText("Alice Roy")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Singh")).toBeInTheDocument();
  });

  it("requires a reason before a manual mark can be saved", async () => {
    const user = userEvent.setup();
    render(<ManualMarkSection />);
    await screen.findByText("Alice Roy");

    await user.selectOptions(screen.getByLabelText(/^student$/i), "1");
    await user.click(screen.getByRole("button", { name: /save manual mark/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a reason/i);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits a manual mark and refreshes the roster afterwards", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    render(<ManualMarkSection />);
    await screen.findByText("Alice Roy");

    await user.selectOptions(screen.getByLabelText(/^student$/i), "1");
    const presentBtn = screen.getAllByRole("button").find((b) => b.textContent === "PRESENT")!;
    await user.click(presentBtn);
    await user.type(screen.getByPlaceholderText(/phone battery dead/i), "Verified in person");
    await user.click(screen.getByRole("button", { name: /save manual mark/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/attendance/qr/manual/", {
        student_id: 1,
        status: "PRESENT",
        reason: "Verified in person",
      })
    );
    // fetchRoster is called once on mount, and once more after a successful mark
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status")).toHaveTextContent(/marked successfully/i);
  });

  it("shows the roster's session-closed notice when no session is open", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { session_open: false, students: [] },
    });
    render(<ManualMarkSection />);

    expect(await screen.findByText(/no attendance session is open/i)).toBeInTheDocument();
  });

  it("re-fetches the roster when the refresh button is clicked", async () => {
    const user = userEvent.setup();
    render(<ManualMarkSection />);
    await screen.findByText("Alice Roy");
    expect(api.get).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTitle(/refresh roster/i));

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});
