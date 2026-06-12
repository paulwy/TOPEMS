import { renderHook, act } from "@testing-library/react";
import { useNotification } from "../../hooks/useNotification";

vi.useFakeTimers();

describe("useNotification Hook", () => {
  test("initializes with empty notifications", () => {
    const { result } = renderHook(() => useNotification());
    expect(result.current.notifications).toEqual([]);
  });

  test("adds notification with showNotification", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification("success", "Test message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("success");
    expect(result.current.notifications[0].message).toBe("Test message");
  });

  test("adds notification with success helper", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.success("Success message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("success");
    expect(result.current.notifications[0].message).toBe("Success message");
  });

  test("adds notification with error helper", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.error("Error message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("error");
    expect(result.current.notifications[0].message).toBe("Error message");
  });

  test("adds notification with info helper", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.info("Info message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("info");
    expect(result.current.notifications[0].message).toBe("Info message");
  });

  test("adds notification with warning helper", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.warning("Warning message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("warning");
    expect(result.current.notifications[0].message).toBe("Warning message");
  });

  test("removes notification with hideNotification", () => {
    const { result } = renderHook(() => useNotification());

    let notificationId: string;
    act(() => {
      notificationId = result.current.showNotification(
        "success",
        "Test message",
      );
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.hideNotification(notificationId!);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  test("removes notification after duration", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification("success", "Test message", 1000);
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  test("keeps notification when duration is 0", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification("success", "Test message", 0);
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  test("supports custom duration", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.success("Custom duration", 5000);
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});
