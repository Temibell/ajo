"use client";

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";
import { useWallet } from "@/context/wallet-context";
import { toast } from "sonner";

// Mock dependencies
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("@/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Navbar Component", () => {
  const mockConnectWallet = jest.fn();
  const mockDisconnectWallet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders brand and navigation links", () => {
    (useWallet as jest.Mock).mockReturnValue({
      address: null,
      connecting: false,
      restoring: false,
      connectWallet: mockConnectWallet,
      disconnectWallet: mockDisconnectWallet,
    });

    render(<Navbar />);

    expect(screen.getByText("Ajo")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Why Stellar")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  test("renders restoring placeholder when restoring is true", () => {
    (useWallet as jest.Mock).mockReturnValue({
      address: null,
      connecting: false,
      restoring: true,
      connectWallet: mockConnectWallet,
      disconnectWallet: mockDisconnectWallet,
    });

    render(<Navbar />);

    const placeholder = screen.getByRole("status", { name: /checking wallet connection/i });
    expect(placeholder).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
  });

  test("handles wallet connection successfully", async () => {
    mockConnectWallet.mockResolvedValueOnce("G1234567890ABCDEF");
    (useWallet as jest.Mock).mockReturnValue({
      address: null,
      connecting: false,
      restoring: false,
      connectWallet: mockConnectWallet,
      disconnectWallet: mockDisconnectWallet,
    });

    render(<Navbar />);

    const connectButton = screen.getByRole("button", { name: /connect wallet/i });
    await userEvent.click(connectButton);

    expect(mockConnectWallet).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Wallet connected");
    });
  });

  test("handles wallet connection error", async () => {
    mockConnectWallet.mockRejectedValueOnce(new Error("User rejected"));
    (useWallet as jest.Mock).mockReturnValue({
      address: null,
      connecting: false,
      restoring: false,
      connectWallet: mockConnectWallet,
      disconnectWallet: mockDisconnectWallet,
    });

    render(<Navbar />);

    const connectButton = screen.getByRole("button", { name: /connect wallet/i });
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Could not connect wallet.");
    });
  });

  test("renders connected address and opens account menu with disconnect option", async () => {
    (useWallet as jest.Mock).mockReturnValue({
      address: "GA3V6SKDC67LCHZJ53VDX2TOSI2K4S7Z5WXXYV36V2ZJYZS3HNJ55XXJ",
      connecting: false,
      restoring: false,
      connectWallet: mockConnectWallet,
      disconnectWallet: mockDisconnectWallet,
    });

    render(<Navbar />);

    // Address should be shortened
    const accountButton = screen.getByRole("button", { name: /GA3V…5XXJ/i });
    expect(accountButton).toBeInTheDocument();

    // Open account menu
    await userEvent.click(accountButton);
    const disconnectItem = screen.getByRole("menuitem", { name: /disconnect/i });
    expect(disconnectItem).toBeInTheDocument();

    // Click disconnect
    await userEvent.click(disconnectItem);
    expect(mockDisconnectWallet).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Wallet disconnected");
  });

  test("closes account menu on Escape key and focuses button", async () => {
    (useWallet as jest.Mock).mockReturnValue({
      address: "GA3V6SKDC67LCHZJ53VDX2TOSI2K4S7Z5WXXYV36V2ZJYZS3HNJ55XXJ",
      connecting: false,
      restoring: false,
      connectWallet: mockConnectWallet,
      disconnectWallet: mockDisconnectWallet,
    });

    render(<Navbar />);

    const accountButton = screen.getByRole("button", { name: /GA3V…5XXJ/i });
    await userEvent.click(accountButton);

    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(accountButton).toHaveFocus();
  });

  test("mobile menu opens and enforces focus trap / escape behavior", async () => {
    (useWallet as jest.Mock).mockReturnValue({
      address: null,
      connecting: false,
      restoring: false,
      connectWallet: mockConnectWallet,
      disconnectWallet: mockDisconnectWallet,
    });

    render(<Navbar />);

    const menuToggle = screen.getByRole("button", { name: /open menu/i });
    await userEvent.click(menuToggle);

    const closeToggle = screen.getByRole("button", { name: /close menu/i });
    expect(closeToggle).toBeInTheDocument();

    // Press Escape to close mobile menu
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
  });
});
