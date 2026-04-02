export interface UploadProgressItem {
  file: File;
  fileName: string;
  fileSize: number;
  progress: number; // 0-100
  speed: number; // bytes per second
  smoothSpeed: number; // smoothed speed using EMA
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  imageId?: string;
  startTime?: number;
  speedHistory: number[]; // history of speed measurements for smoothing
}

export interface UploadProgress {
  items: UploadProgressItem[];
  totalProgress: number;
  totalSize: number;
  uploadedSize: number;
  currentSpeed: number;
  smoothSpeed: number; // overall smoothed speed
  status: 'idle' | 'uploading' | 'completed' | 'error';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${Math.round(seconds % 60)}秒`;
  return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
}
