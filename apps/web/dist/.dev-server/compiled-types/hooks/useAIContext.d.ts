export interface AIRecommendation {
    id: string;
    label: string;
    description: string;
    action: string;
    icon?: string;
}
export interface AIContextState {
    currentPage: string;
    module: string | null;
    recommendations: AIRecommendation[];
    quickCommands: QuickCommand[];
}
export interface QuickCommand {
    command: string;
    label: string;
    description: string;
    action: string;
}
export declare function useAIContext(): AIContextState;
export default useAIContext;
