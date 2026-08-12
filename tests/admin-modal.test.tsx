import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";

// Mock the locale provider
vi.mock("@/components/providers/locale-provider", () => ({
  useLocale: () => ({ locale: "he", dir: "rtl" }),
}));

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

function TestModal({
  open = true,
  onOpenChange = vi.fn(),
  size = "md" as const,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: "sm" | "md" | "lg" | "xl" | "product";
  children?: React.ReactNode;
}) {
  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size={size}>
      <AdminModalHeader onClose={() => onOpenChange(false)}>
        <AdminModalTitle>Test Dialog</AdminModalTitle>
      </AdminModalHeader>
      <AdminModalBody>
        {children ?? <p>Modal content</p>}
      </AdminModalBody>
      <AdminModalFooter>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </AdminModalFooter>
    </AdminModal>
  );
}

// Each test gets a fresh container to avoid portal/cleanup conflicts
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup();
  // Remove any portal leftovers from body
  document.body.innerHTML = "";
  document.body.appendChild(document.createElement("div")); // restore for next test
});

describe("AdminModal", () => {
  // ─── INVARIANT #1: Overlay + Panel always co-exist ───
  describe("Invariant: Overlay and Panel always appear together", () => {
    it("renders both overlay and panel when open=true", () => {
      render(<TestModal open={true} />, { container });
      const overlay = document.querySelector('[data-slot="admin-modal-overlay"]');
      const panel = document.querySelector('[data-slot="admin-modal-panel"]');
      expect(overlay).not.toBeNull();
      expect(panel).not.toBeNull();
    });

    it("renders neither overlay nor panel when open=false", () => {
      render(<TestModal open={false} />, { container });
      const overlay = document.querySelector('[data-slot="admin-modal-overlay"]');
      const panel = document.querySelector('[data-slot="admin-modal-panel"]');
      expect(overlay).toBeNull();
      expect(panel).toBeNull();
    });

    it("CRITICAL: never overlay without panel", () => {
      render(<TestModal open={true} />, { container });
      const overlay = document.querySelector('[data-slot="admin-modal-overlay"]');
      const panel = document.querySelector('[data-slot="admin-modal-panel"]');
      if (overlay) {
        expect(panel).not.toBeNull();
      }
    });
  });

  // ─── INVARIANT #2: Panel is opaque white ───
  describe("Panel visual properties", () => {
    it("panel has opaque background", () => {
      render(<TestModal open={true} />, { container });
      const panel = document.querySelector('[data-slot="admin-modal-panel"]') as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.style.opacity).toBe("1");
      // backgroundColor can be #FFFFFF or rgb(255,255,255)
      expect(panel.style.backgroundColor).toBeTruthy();
    });
  });

  // ─── INVARIANT #3: Portal mounts under body ───
  describe("Portal mounting", () => {
    it("overlay and panel are inside document.body", () => {
      render(<TestModal open={true} />, { container });
      const overlay = document.querySelector('[data-slot="admin-modal-overlay"]') as HTMLElement;
      const panel = document.querySelector('[data-slot="admin-modal-panel"]') as HTMLElement;
      expect(document.body.contains(overlay)).toBe(true);
      expect(document.body.contains(panel)).toBe(true);
    });
  });

  // ─── INVARIANT #4: Close behaviors ───
  describe("Close behavior", () => {
    it("ESC key triggers onOpenChange(false)", () => {
      const onOpenChange = vi.fn();
      render(<TestModal open={true} onOpenChange={onOpenChange} />, { container });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("X button triggers onClose", () => {
      const onOpenChange = vi.fn();
      render(<TestModal open={true} onOpenChange={onOpenChange} />, { container });
      const closeBtn = screen.getByLabelText("Close");
      fireEvent.click(closeBtn);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("positioner click triggers close", () => {
      const onOpenChange = vi.fn();
      render(<TestModal open={true} onOpenChange={onOpenChange} />, { container });
      const positioner = document.querySelector('[data-slot="admin-modal-positioner"]') as HTMLElement;
      fireEvent.click(positioner);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("panel click does NOT close", () => {
      const onOpenChange = vi.fn();
      render(<TestModal open={true} onOpenChange={onOpenChange} />, { container });
      const panel = document.querySelector('[data-slot="admin-modal-panel"]') as HTMLElement;
      fireEvent.click(panel);
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  // ─── INVARIANT #5: Error boundary keeps panel visible ───
  describe("Error boundary", () => {
    function CrashingComponent(): React.ReactNode {
      throw new Error("Test crash");
    }

    it("panel remains visible when child throws", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <TestModal open={true}>
          <CrashingComponent />
        </TestModal>,
        { container }
      );

      const overlay = document.querySelector('[data-slot="admin-modal-overlay"]');
      const panel = document.querySelector('[data-slot="admin-modal-panel"]');
      expect(overlay).not.toBeNull();
      expect(panel).not.toBeNull();
      expect(screen.getByText("לא הצלחנו לטעון את הטופס")).not.toBeNull();
      expect(screen.getByText("נסה שוב")).not.toBeNull();
      consoleSpy.mockRestore();
    });

    it("retry button resets error state", async () => {
      let shouldCrash = true;
      function MaybeCrash() {
        if (shouldCrash) throw new Error("Test crash");
        return <p>Recovered content</p>;
      }

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <TestModal open={true}>
          <MaybeCrash />
        </TestModal>,
        { container }
      );

      expect(screen.getByText("לא הצלחנו לטעון את הטופס")).not.toBeNull();

      shouldCrash = false;
      fireEvent.click(screen.getByText("נסה שוב"));

      await waitFor(() => {
        expect(screen.getByText("Recovered content")).not.toBeNull();
      });
      consoleSpy.mockRestore();
    });
  });

  // ─── INVARIANT #6: Loading state keeps panel visible ───
  describe("Loading state", () => {
    it("panel visible while loading content inside", () => {
      render(
        <TestModal open={true}>
          <div data-testid="loader">Loading...</div>
        </TestModal>,
        { container }
      );
      const panel = document.querySelector('[data-slot="admin-modal-panel"]');
      expect(panel).not.toBeNull();
      expect(screen.getByTestId("loader")).not.toBeNull();
    });
  });

  // ─── INVARIANT #7: Repeated open/close cycles ───
  describe("Repeated open/close", () => {
    it("20x open/close — no orphan overlay", () => {
      const onOpenChange = vi.fn();
      const { rerender } = render(<TestModal open={false} onOpenChange={onOpenChange} />, { container });

      for (let i = 0; i < 20; i++) {
        rerender(<TestModal open={true} onOpenChange={onOpenChange} />);
        expect(document.querySelector('[data-slot="admin-modal-overlay"]')).not.toBeNull();
        expect(document.querySelector('[data-slot="admin-modal-panel"]')).not.toBeNull();

        rerender(<TestModal open={false} onOpenChange={onOpenChange} />);
        expect(document.querySelector('[data-slot="admin-modal-overlay"]')).toBeNull();
        expect(document.querySelector('[data-slot="admin-modal-panel"]')).toBeNull();
      }
    });
  });

  // ─── INVARIANT #8: Body scroll in panel ───
  describe("Scroll structure", () => {
    it("AdminModalBody has overflow-y-auto", () => {
      render(<TestModal open={true} />, { container });
      const body = document.querySelector('[data-slot="admin-modal-body"]');
      expect(body).not.toBeNull();
      expect(body?.className).toContain("overflow-y-auto");
    });

    it("panel has max-h class", () => {
      render(<TestModal open={true} />, { container });
      const panel = document.querySelector('[data-slot="admin-modal-panel"]') as HTMLElement;
      expect(panel?.className).toContain("max-h-");
    });
  });

  // ─── INVARIANT #9: All sizes render ───
  describe("Sizes", () => {
    const sizes = ["sm", "md", "lg", "xl", "product"] as const;
    for (const size of sizes) {
      it(`size="${size}" renders panel`, () => {
        render(<TestModal open={true} size={size} />, { container });
        expect(document.querySelector('[data-slot="admin-modal-panel"]')).not.toBeNull();
      });
    }
  });

  // ─── INVARIANT #10: Accessibility ───
  describe("Accessibility", () => {
    it("positioner has role=dialog and aria-modal=true", () => {
      render(<TestModal open={true} />, { container });
      const pos = document.querySelector('[data-slot="admin-modal-positioner"]');
      expect(pos?.getAttribute("role")).toBe("dialog");
      expect(pos?.getAttribute("aria-modal")).toBe("true");
    });
  });
});
