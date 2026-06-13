import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useNotificationSettings hook", () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("initial state", () => {
    it("should initialize with default settings when no stored settings", () => {
      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.settings.enableDesktop).toBe(true);
      expect(result.current.settings.enableSound).toBe(true);
      expect(result.current.settings.enableMobilePush).toBe(true);
    });

    it("should load settings from localStorage", () => {
      const savedSettings = {
        enableDesktop: false,
        enableSound: false,
        enableMobilePush: true,
        types: { system: true, workflow: false, reminder: true, alert: true, message: true },
        quietHours: { enabled: true, start: "23:00", end: "07:00" },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings));

      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.settings.enableDesktop).toBe(false);
      expect(result.current.settings.enableSound).toBe(false);
    });

    it("should use default settings for invalid stored JSON", () => {
      // Mock getItem to return invalid JSON first, then null for legacy keys
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "notificationSettings") return "invalid json";
        return null;
      });

      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.settings.enableDesktop).toBe(true);
    });
  });

  describe("setSettings", () => {
    it("should update settings directly", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setSettings({
          enableDesktop: false,
          enableSound: true,
          enableMobilePush: false,
          types: { system: true, workflow: true, reminder: true, alert: true, message: true },
          quietHours: { enabled: false, start: "22:00", end: "08:00" },
        });
      });

      expect(result.current.settings.enableDesktop).toBe(false);
      expect(result.current.settings.enableMobilePush).toBe(false);
    });

    it("should update settings using updater function", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setSettings((prev) => ({
          ...prev,
          enableDesktop: !prev.enableDesktop,
        }));
      });

      expect(result.current.settings.enableDesktop).toBe(false);
    });

    it("should persist settings to localStorage", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setSettings((prev) => ({
          ...prev,
          enableDesktop: false,
        }));
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const storedCall = localStorageMock.setItem.mock.calls[0];
      const stored = JSON.parse(storedCall[1]);
      expect(stored.enableDesktop).toBe(false);
    });
  });

  describe("isInQuietHours", () => {
    it("should return false when quiet hours disabled", () => {
      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.isInQuietHours()).toBe(false);
    });
  });

  describe("isNotificationTypeEnabled", () => {
    it("should return true for enabled notification type", () => {
      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.isNotificationTypeEnabled("system")).toBe(true);
    });

    it("should return true for unknown notification type (default)", () => {
      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.isNotificationTypeEnabled("unknown")).toBe(true);
    });
  });

  describe("shouldShowNotification", () => {
    it("should return true when not in quiet hours", () => {
      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.shouldShowNotification()).toBe(true);
    });

    it("should return false when notification type disabled", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setSettings((prev) => ({
          ...prev,
          types: { ...prev.types, system: false },
        }));
      });

      expect(result.current.shouldShowNotification("system")).toBe(false);
    });
  });

  describe("shouldPlaySound", () => {
    it("should return true when sound enabled", () => {
      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.shouldPlaySound()).toBe(true);
    });

    it("should return false when sound disabled", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setSettings((prev) => ({
          ...prev,
          enableSound: false,
        }));
      });

      expect(result.current.shouldPlaySound()).toBe(false);
    });
  });

  describe("shouldShowDesktopNotification", () => {
    it("should return true when desktop enabled", () => {
      const { result } = renderHook(() => useNotificationSettings());
      expect(result.current.shouldShowDesktopNotification()).toBe(true);
    });

    it("should return false when desktop disabled", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setSettings((prev) => ({
          ...prev,
          enableDesktop: false,
        }));
      });

      expect(result.current.shouldShowDesktopNotification()).toBe(false);
    });
  });

  describe("toggleSetting", () => {
    it("should toggle enableDesktop", () => {
      const { result } = renderHook(() => useNotificationSettings());
      const initial = result.current.settings.enableDesktop;

      act(() => {
        result.current.toggleSetting("enableDesktop");
      });

      expect(result.current.settings.enableDesktop).toBe(!initial);
    });

    it("should toggle enableSound", () => {
      const { result } = renderHook(() => useNotificationSettings());
      const initial = result.current.settings.enableSound;

      act(() => {
        result.current.toggleSetting("enableSound");
      });

      expect(result.current.settings.enableSound).toBe(!initial);
    });
  });

  describe("toggleNotificationType", () => {
    it("should toggle system notification type", () => {
      const { result } = renderHook(() => useNotificationSettings());
      const initial = result.current.settings.types.system;

      act(() => {
        result.current.toggleNotificationType("system");
      });

      expect(result.current.settings.types.system).toBe(!initial);
    });
  });

  describe("toggleQuietHours", () => {
    it("should toggle quiet hours enabled state", () => {
      const { result } = renderHook(() => useNotificationSettings());
      const initial = result.current.settings.quietHours.enabled;

      act(() => {
        result.current.toggleQuietHours();
      });

      expect(result.current.settings.quietHours.enabled).toBe(!initial);
    });
  });

  describe("updateQuietHours", () => {
    it("should update quiet hours start time", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.updateQuietHours("start", "21:00");
      });

      expect(result.current.settings.quietHours.start).toBe("21:00");
    });

    it("should update quiet hours end time", () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.updateQuietHours("end", "09:00");
      });

      expect(result.current.settings.quietHours.end).toBe("09:00");
    });
  });
});
