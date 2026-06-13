import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast, toast, reducer } from "../../hooks/use-toast";

describe("useToast hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should initialize with empty toasts", () => {
      const { result } = renderHook(() => useToast());
      expect(result.current.toasts).toEqual([]);
    });
  });

  describe("toast function", () => {
    it("should add a toast", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: "Test Toast" });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe("Test Toast");
    });

    it("should add toast with description", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: "Test Toast",
          description: "This is a description",
        });
      });

      expect(result.current.toasts[0].description).toBe("This is a description");
    });

    it("should generate unique toast ids", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: "Toast 1" });
        result.current.toast({ title: "Toast 2" });
      });

      expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
    });

    it("should limit toasts to TOAST_LIMIT", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.toast({ title: `Toast ${i}` });
        }
      });

      expect(result.current.toasts.length).toBeLessThanOrEqual(20);
    });
  });

  describe("dismiss function", () => {
    it("should dismiss a specific toast", () => {
      const { result } = renderHook(() => useToast());

      let toastId: string = "";
      act(() => {
        const t = result.current.toast({ title: "Test Toast" });
        toastId = t.id;
      });

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it("should dismiss all toasts when no id provided", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: "Toast 1" });
        result.current.toast({ title: "Toast 2" });
      });

      act(() => {
        result.current.dismiss();
      });

      result.current.toasts.forEach((t) => {
        expect(t.open).toBe(false);
      });
    });
  });

  describe("toast return value", () => {
    it("should return id, dismiss, and update functions", () => {
      const { result } = renderHook(() => useToast());

      let toastResult: ReturnType<typeof toast> = { id: "", dismiss: vi.fn(), update: vi.fn() };
      act(() => {
        toastResult = result.current.toast({ title: "Test Toast" });
      });

      expect(toastResult.id).toBeTruthy();
      expect(typeof toastResult.dismiss).toBe("function");
      expect(typeof toastResult.update).toBe("function");
    });

    it("should update toast", () => {
      const { result } = renderHook(() => useToast());

      let toastResult: ReturnType<typeof toast> = { id: "", dismiss: vi.fn(), update: vi.fn() };
      act(() => {
        toastResult = result.current.toast({ title: "Original Title" });
      });

      act(() => {
        toastResult.update({ id: toastResult.id, title: "Updated Title" });
      });

      expect(result.current.toasts[0].title).toBe("Updated Title");
    });
  });
});

describe("toast reducer", () => {
  it("should handle ADD_TOAST", () => {
    const state = { toasts: [] };
    const action = {
      type: "ADD_TOAST" as const,
      toast: { id: "1", title: "Test", open: true },
    };

    const newState = reducer(state, action);
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].title).toBe("Test");
  });

  it("should handle UPDATE_TOAST", () => {
    const state = {
      toasts: [{ id: "1", title: "Original", open: true }],
    };
    const action = {
      type: "UPDATE_TOAST" as const,
      toast: { id: "1", title: "Updated" },
    };

    const newState = reducer(state, action);
    expect(newState.toasts[0].title).toBe("Updated");
  });

  it("should handle DISMISS_TOAST", () => {
    const state = {
      toasts: [{ id: "1", title: "Test", open: true }],
    };
    const action = {
      type: "DISMISS_TOAST" as const,
      toastId: "1",
    };

    const newState = reducer(state, action);
    expect(newState.toasts[0].open).toBe(false);
  });

  it("should handle REMOVE_TOAST", () => {
    const state = {
      toasts: [
        { id: "1", title: "Test 1", open: true },
        { id: "2", title: "Test 2", open: true },
      ],
    };
    const action = {
      type: "REMOVE_TOAST" as const,
      toastId: "1",
    };

    const newState = reducer(state, action);
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].id).toBe("2");
  });

  it("should remove all toasts when toastId is undefined", () => {
    const state = {
      toasts: [
        { id: "1", title: "Test 1", open: true },
        { id: "2", title: "Test 2", open: true },
      ],
    };
    const action = {
      type: "REMOVE_TOAST" as const,
    };

    const newState = reducer(state, action);
    expect(newState.toasts).toHaveLength(0);
  });
});
