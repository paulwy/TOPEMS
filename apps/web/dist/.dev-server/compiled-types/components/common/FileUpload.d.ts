import React from "react";
/**
 * 文件上传组件属性
 */
export interface FileUploadProps {
    /** 当前文件URL列表 */
    value?: string[];
    /** 值改变回调 */
    onChange?: (files: string[]) => void;
    /** 最大上传数量 */
    maxCount?: number;
    /** 允许的文件类型，如 ['.pdf', '.doc', '.docx'] */
    accept?: string[];
    /** 单个文件最大大小（MB） */
    maxSize?: number;
    /** 总文件最大大小（MB） */
    maxTotalSize?: number;
    /** 上传区域高度 */
    height?: number | string;
    /** 是否禁用 */
    disabled?: boolean;
    /** 自定义类名 */
    className?: string;
    /** 上传按钮文本 */
    uploadText?: string;
}
/**
 * 文件上传组件
 * 支持多文件上传、显示上传进度、删除和文件类型限制
 */
declare const FileUpload: React.FC<FileUploadProps>;
export default FileUpload;
