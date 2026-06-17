export type AIFeatureType = "code" | "text" | "document" | "validate" | "complete";
export interface ValidationIssue {
    field: string;
    type: "error" | "warning" | "info";
    message: string;
    fix?: string;
}
export interface Suggestion {
    field: string;
    value: any;
    reason: string;
}
export interface ValidateRequest {
    data: Record<string, any>;
    schema?: string;
    context?: {
        module: string;
        entityType: string;
    };
}
export interface ValidateResponse {
    valid: boolean;
    issues: ValidationIssue[];
    suggestions: Suggestion[];
}
export interface CompleteRequest {
    data?: Record<string, any>;
    partialData?: Record<string, any>;
    fieldsToComplete?: string[];
    context?: {
        module: string;
        entityType: string;
    };
}
export interface CompletionItem {
    value: any;
    confidence: number;
    source: "inference" | "history" | "knowledge";
}
export interface CompleteResponse {
    completions: Record<string, CompletionItem>;
}
export interface SummarizeRequest {
    text: string;
    maxLength?: number;
    type?: "short" | "medium" | "detailed";
    context?: any;
}
export interface SummarizeResponse {
    summary: string;
    keyPoints: string[];
}
export interface AITemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    fields: Array<{
        name: string;
        type: "text" | "number" | "date" | "select" | "textarea";
        label: string;
        required?: boolean;
        options?: Array<{
            label: string;
            value: string;
        }>;
    }>;
    promptTemplate: string;
}
export interface CodeGenerateContext {
    entityType: "department" | "employee" | "project" | "contract";
    name?: string;
    parentId?: string;
    type?: string;
}
export interface TextOptimizeContext {
    textType: "description" | "duty" | "profile" | "clause";
    name?: string;
    keywords?: string[];
}
