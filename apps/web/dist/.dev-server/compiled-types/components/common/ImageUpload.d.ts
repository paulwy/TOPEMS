import React from "react";
/**
 * 图片上传组件属性
 */
export interface ImageUploadProps {
    /** 当前图片URL列表 */
    value?: string[];
    /** 值改变回调 */
    onChange?: (files: string[]) => void;
    /** 最大上传数量 */
    maxCount?: number;
    /** 允许的文件类型 */
    accept?: string;
    /** 单张图片最大大小（MB） */
    maxSize?: number;
    /** 是否支持裁剪 */
    cropEnabled?: boolean;
    /** 裁剪比例，如 16/9 */
    cropAspect?: number;
    /** 上传区域高度 */
    height?: number | string;
    /** 是否禁用 */
    disabled?: boolean;
    /** 自定义类名 */
    className?: string;
}
/**
 * 图片上传组件
 * 支持拖拽上传、预览、删除、多图上传和裁剪功能
 */
declare const ImageUpload: React.FC<ImageUploadProps>;
export default ImageUpload;
