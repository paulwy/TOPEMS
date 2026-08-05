/**
 * 图片上传组件
 * 支持拖拽上传、预览、删除、多图上传和裁剪功能
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  TextField,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Image, X, Upload, Crop, Trash2, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';
import { logger } from '@/utils/logger';

// ============ 类型定义 ============

/**
 * 图片上传组件属性
 */
export interface ImageUploadProps {
  /** 当前图片URL列表，支持受控模式 */
  value?: string[];
  /** 值改变回调，返回更新后的图片URL列表 */
  onChange?: (files: string[]) => void;
  /** 最大上传数量，默认为 9 */
  maxCount?: number;
  /** 允许的文件类型，默认为 'image/*' */
  accept?: string;
  /** 单张图片最大大小（MB），默认为 5 */
  maxSize?: number;
  /** 是否支持裁剪功能，默认为 true */
  cropEnabled?: boolean;
  /** 裁剪比例，如 16/9，默认为 1（正方形） */
  cropAspect?: number;
  /** 上传区域高度，支持数字（px）或字符串 */
  height?: number | string;
  /** 是否禁用上传功能，默认为 false */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  uploading?: boolean;
  progress?: number;
}

// styled() retained: dynamic custom props (isDragging, isDisabled, isFull) require shouldForwardProp
const UploadArea = styled(Box, {
  shouldForwardProp: (prop) => !['isDragging', 'isDisabled', 'isFull'].includes(prop as string),
})<{
  isDragging?: boolean;
  isDisabled?: boolean;
  isFull?: boolean;
}>(({ theme, isDragging, isDisabled, isFull }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  border: `2px dashed ${
    isDragging
      ? theme.palette.primary.main
      : isDisabled
        ? theme.palette.grey[300]
        : theme.palette.divider
  }`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: isDragging
    ? `${theme.palette.primary.light}20`
    : isDisabled
      ? theme.palette.grey[50]
      : 'transparent',
  cursor: isDisabled || isFull ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  color: isDisabled ? theme.palette.grey[400] : theme.palette.text.secondary,
  '&:hover': {
    borderColor: isDisabled ? theme.palette.grey[300] : theme.palette.primary.main,
    backgroundColor: isDisabled || isFull ? 'transparent' : `${theme.palette.primary.light}10`,
  },
}));

/**
 * 图片上传组件
 * 支持拖拽上传、预览、删除、多图上传和裁剪功能
 *
 * @example
 * ```tsx
 * // 基础用法
 * <ImageUpload
 *   value={images}
 *   onChange={(newImages) => setImages(newImages)}
 * />
 *
 * // 限制上传数量和大小
 * <ImageUpload
 *   value={avatarImages}
 *   onChange={(newImages) => setAvatarImages(newImages)}
 *   maxCount={1}
 *   maxSize={2}
 * />
 *
 * // 禁用裁剪功能
 * <ImageUpload
 *   value={galleryImages}
 *   onChange={(newImages) => setGalleryImages(newImages)}
 *   cropEnabled={false}
 * />
 *
 * // 自定义上传区域高度
 * <ImageUpload
 *   value={bannerImages}
 *   onChange={(newImages) => setBannerImages(newImages)}
 *   height={300}
 * />
 *
 * // 禁用上传
 * <ImageUpload
 *   value={readOnlyImages}
 *   disabled
 * />
 * ```
 */
const ImageUpload: React.FC<ImageUploadProps> = ({
  value = [],
  onChange,
  maxCount = 9,
  accept = 'image/*',
  maxSize = 5,
  cropEnabled = true,
  cropAspect = 1,
  height = 200,
  disabled = false,
  className,
}) => {
  const [images, setImages] = useState<ImageFile[]>(
    value.map((url, index) => ({
      id: `existing-${index}`,
      file: new File([], url),
      preview: url,
    }))
  );
  const [dragging, setDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 生成唯一ID
   */
  const generateId = () => `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const validFiles: File[] = [];
      const remainingSlots = maxCount - images.length;

      Array.from(files).forEach((file) => {
        if (validFiles.length >= remainingSlots) return;

        if (!file.type.startsWith('image/')) {
          logger.warn(`文件 ${file.name} 不是图片类型`);
          return;
        }

        if (file.size > maxSize * 1024 * 1024) {
          logger.warn(`文件 ${file.name} 超过大小限制 ${maxSize}MB`);
          return;
        }

        validFiles.push(file);
      });

      const newImages: ImageFile[] = validFiles.map((file) => ({
        id: generateId(),
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        progress: 100,
      }));

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onChange?.(updatedImages.map((img) => img.preview));
    },
    [images, maxCount, maxSize, onChange]
  );

  /**
   * 处理拖拽开始
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };

  /**
   * 处理拖拽结束
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * 处理拖拽放下
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  };

  /**
   * 处理删除图片
   */
  const handleDelete = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id);
    setImages(updatedImages);
    onChange?.(updatedImages.map((img) => img.preview));
  };

  /**
   * 处理裁剪
   */
  const handleCrop = (image: ImageFile) => {
    setCropImage(image.preview);
    setCropZoom(1);
    setCropRotation(0);
  };

  /**
   * 确认裁剪
   */
  const handleCropConfirm = () => {
    if (!cropImage) return;

    // 模拟裁剪后的结果（实际项目中需要使用 canvas 或专业裁剪库）
    const updatedImages = images.map((img) =>
      img.preview === cropImage ? { ...img, preview: `${cropImage}?crop=${Date.now()}` } : img
    );

    setImages(updatedImages);
    onChange?.(updatedImages.map((img) => img.preview));
    setCropImage(null);
  };

  /**
   * 渲染上传区域
   */
  const renderUploadArea = () => (
    <UploadArea
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      isDragging={dragging}
      isDisabled={disabled}
      isFull={images.length >= maxCount}
      sx={{ height }}
      className={className}
    >
      <Upload size={40} />
      <Typography
        variant='body1'
        sx={{ mt: 1 }}
      >
        {dragging ? '松开以上传' : '拖拽图片或点击上传'}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 0.5 }}
      >
        最多上传 {maxCount} 张图片，单张不超过 {maxSize}MB
      </Typography>
      <input
        ref={fileInputRef}
        type='file'
        accept={accept}
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />
    </UploadArea>
  );

  /**
   * 渲染图片网格
   */
  const renderImageGrid = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
      {images.map((image) => (
        <Box
          key={image.id}
          sx={{
            position: 'relative',
            width: 100,
            height: 100,
            borderRadius: 2,
            overflow: 'hidden',
            '& img': {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              cursor: 'pointer',
            },
            '&:hover .overlay': {
              opacity: 1,
            },
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
          <img
            src={image.preview}
            alt=''
            onClick={() => setPreviewImage(image.preview)}
          />
          <Box
            className='overlay'
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'action.active',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              opacity: 0,
              transition: 'opacity 0.2s',
              '& .MuiIconButton-root': {
                color: 'common.white',
                '&:hover': {
                  backgroundColor: 'action.disabledBackground',
                },
              },
            }}
          >
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(image.preview);
              }}
            aria-label="图片"
            >
              <Image size={16} />
            </IconButton>
            {cropEnabled && (
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  handleCrop(image);
                }}
              aria-label="裁剪"
              >
                <Crop size={16} />
              </IconButton>
            )}
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(image.id);
              }}
            aria-label="删除"
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        </Box>
      ))}
      {images.length < maxCount && renderUploadArea()}
    </Box>
  );

  return (
    <Box>
      {images.length === 0 ? (
        renderUploadArea()
      ) : (
        <>
          {renderUploadArea()}
          {renderImageGrid()}
        </>
      )}

      {/* 预览弹窗 */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth='xl'
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            图片预览
            <IconButton
              onClick={() => setPreviewImage(null)}
              sx={{ ml: 'auto' }}
            aria-label="关闭"
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewImage && (
            <img
              src={previewImage}
              alt=''
              style={{ maxWidth: '80vw', maxHeight: '70vh' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 裁剪弹窗 */}
      <Dialog
        open={!!cropImage}
        onClose={() => setCropImage(null)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            图片裁剪
            <IconButton
              onClick={() => setCropImage(null)}
              sx={{ ml: 'auto' }}
            aria-label="关闭"
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 300,
              bgcolor: 'grey.100',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {cropImage && (
              <img
                src={cropImage}
                alt=''
                style={{
                  transform: `scale(${cropZoom}) rotate(${cropRotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '50vh',
                  transition: 'transform 0.2s',
                }}
              />
            )}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='body2'
              gutterBottom
            >
              缩放
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ZoomOut size={20} />
              <Slider
                value={cropZoom}
                onChange={(_, value) => setCropZoom(value as number)}
                min={0.5}
                max={3}
                step={0.1}
              />
              <ZoomIn size={20} />
            </Box>
            <Typography
              variant='body2'
              gutterBottom
              sx={{ mt: 1 }}
            >
              旋转
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => setCropRotation((r) => r - 90)}aria-label="旋转" >
                <RotateCw
                  size={20}
                  style={{ transform: 'scaleX(-1)' }}
                />
              </IconButton>
              <TextField
                value={cropRotation}
                onChange={(e) => setCropRotation(parseInt(e.target.value) || 0)}
                type='number'
                size='small'
                slotProps={{
                  input: {
                    endAdornment: <Typography variant='body2'>°</Typography>,
                  },
                }}
              />
              <IconButton onClick={() => setCropRotation((r) => r + 90)}aria-label="旋转" >
                <RotateCw size={20} />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCropImage(null)}>取消</Button>
          <Button
            onClick={handleCropConfirm}
            variant='contained'
            startIcon={<Check size={16} />}
          >
            确认裁剪
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageUpload;
