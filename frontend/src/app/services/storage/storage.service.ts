import { Injectable } from '@angular/core';
import { Logger } from '../logger/logger.service';

export interface StorageConfig {
  key: string;
  defaultValue?: any;
}

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly logger: Logger = new Logger(StorageService.name);

  /**
   * 获取存储的数据
   */
  get<T>(config: StorageConfig): T | null {
    try {
      const value = localStorage.getItem(config.key);
      if (value === null) {
        return config.defaultValue ?? null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Failed to get storage item '${config.key}':`, error);
      return config.defaultValue ?? null;
    }
  }

  /**
   * 设置存储数据
   */
  set<T>(config: StorageConfig, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(config.key, serialized);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set storage item '${config.key}':`, error);
      return false;
    }
  }

  /**
   * 删除存储项
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove storage item '${key}':`, error);
      return false;
    }
  }

  /**
   * 检查存储项是否存在
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}

// 预定义的存储配置
export const STORAGE_CONFIGS = {
  ALBUMS: {
    key: 'picsur_albums',
    defaultValue: [],
  },
  SHARE_RECORDS: {
    key: 'picsur_share_records',
    defaultValue: [],
  },
  USER_SETTINGS: {
    key: 'picsur_user_settings',
    defaultValue: {
      copyFormat: 'url',
      gridColumns: 4,
      autoUploadClipboard: false,
      confirmDelete: true,
    },
  },
} as const;
