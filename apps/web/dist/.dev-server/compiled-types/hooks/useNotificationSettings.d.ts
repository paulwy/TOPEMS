export interface NotificationSettingsData {
    enableDesktop: boolean;
    enableSound: boolean;
    enableMobilePush: boolean;
    types: {
        system: boolean;
        workflow: boolean;
        reminder: boolean;
        alert: boolean;
        message: boolean;
    };
    quietHours: {
        enabled: boolean;
        start: string;
        end: string;
    };
}
export declare const useNotificationSettings: () => {
    settings: NotificationSettingsData;
    setSettings: (newSettings: NotificationSettingsData | ((prev: NotificationSettingsData) => NotificationSettingsData)) => void;
    isInQuietHours: () => boolean;
    isNotificationTypeEnabled: (type: string) => boolean;
    shouldShowNotification: (type?: string) => boolean;
    shouldPlaySound: () => boolean;
    shouldShowDesktopNotification: () => boolean;
    toggleSetting: (key: keyof Omit<NotificationSettingsData, "types" | "quietHours">) => void;
    toggleNotificationType: (type: keyof NotificationSettingsData["types"]) => void;
    toggleQuietHours: () => void;
    updateQuietHours: (field: "start" | "end", value: string) => void;
};
export default useNotificationSettings;
