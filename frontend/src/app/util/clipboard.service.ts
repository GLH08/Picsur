import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ClipboardService {
  /**
   * 复制文本到剪贴板
   */
  async copyText(text: string): Promise<boolean> {
    // 优先使用 Clipboard API
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fallback to execCommand
      }
    }

    // 降级方案
    return this.fallbackCopyText(text);
  }

  /**
   * 降级文本复制方案
   */
  private fallbackCopyText(text: string): boolean {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }

  // 兼容旧方法
  async copy(text: string): Promise<boolean> {
    return this.copyText(text);
  }
}
