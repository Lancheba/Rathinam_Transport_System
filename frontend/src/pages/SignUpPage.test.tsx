import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SignUpPage } from "./SignUpPage";
import api from "../api/client";

const mockNavigate = vi.fn();

vi.mock("../api/client", () => ({
  default: { post: vi.fn() },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderSignUp = () =>
  render(
    <MemoryRouter>
      <SignUpPage />
    </MemoryRouter>
  );

// Fills step 1 and advances to step 2 (username/password step).
const goToStep2 = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/full name/i), "Alice Example");
  await user.type(screen.getByLabelText(/email address/i), "alice@example.com");
  await user.click(screen.getByRole("button", { name: /continue/i }));
};

describe("SignUpPage", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    mockNavigate.mockReset();
  });

  it("blocks step 1 -> step 2 when required fields are missing", async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter your full name and email/i);
    expect(screen.queryByLabelText(/^username$/i)).not.toBeInTheDocument();
  });

  it("rejects an invalid email address on step 1", async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(screen.getByLabelText(/full name/i), "Alice Example");
    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a valid email/i);
  });

  it("advances to step 2 with valid name/email", async () => {
    const user = userEvent.setup();
    renderSignUp();

    await goToStep2(user);

    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /step 2 of 2/i })).toBeInTheDocument();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const user = userEvent.setup();
    renderSignUp();
    await goToStep2(user);

    await user.type(screen.getByLabelText(/^username$/i), "alice");
    await user.type(screen.getByLabelText(/^password$/i), "short1");
    await user.type(screen.getByLabelText(/confirm password/i), "short1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8 characters/i);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    renderSignUp();
    await goToStep2(user);

    await user.type(screen.getByLabelText(/^username$/i), "alice");
    await user.type(screen.getByLabelText(/^password$/i), "goodpassword1");
    await user.type(screen.getByLabelText(/confirm password/i), "goodpassword2");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/passwords do not match/i);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows a strong strength label for a long mixed-case password with a digit", async () => {
    const user = userEvent.setup();
    renderSignUp();
    await goToStep2(user);

    await user.type(screen.getByLabelText(/^password$/i), "Sup3rSecret");
    expect(screen.getByText(/^strong$/i)).toBeInTheDocument();
  });

  it("registers successfully and navigates to /login?registered=1", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderSignUp();
    await goToStep2(user);

    await user.type(screen.getByLabelText(/^username$/i), "alice");
    await user.type(screen.getByLabelText(/^password$/i), "goodpassword1");
    await user.type(screen.getByLabelText(/confirm password/i), "goodpassword1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/auth/register/", {
        username: "alice",
        password: "goodpassword1",
        email: "alice@example.com",
        full_name: "Alice Example",
        phone: "",
      })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login?registered=1"));
  });

  it("surfaces the server's field error on a failed registration", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { username: ["This username is already taken."] } },
    });
    const user = userEvent.setup();
    renderSignUp();
    await goToStep2(user);

    await user.type(screen.getByLabelText(/^username$/i), "alice");
    await user.type(screen.getByLabelText(/^password$/i), "goodpassword1");
    await user.type(screen.getByLabelText(/confirm password/i), "goodpassword1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already taken/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
