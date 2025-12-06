import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UI_TEXT_ZH } from '../i18n/ui.i18n';

export type Language = 'zh' | 'en';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private currentLanguage$ = new BehaviorSubject<Language>('zh');
  private translations: { [key in Language]: any } = {
    zh: UI_TEXT_ZH,
    en: {}, // 如果需要英文，可以在这里添加
  };

  constructor() {
    // 从localStorage获取保存的语言设置
    const savedLanguage = localStorage.getItem('picsur-language') as Language;
    if (savedLanguage && ['zh', 'en'].includes(savedLanguage)) {
      this.setLanguage(savedLanguage);
    } else {
      // 默认使用中文
      this.setLanguage('zh');
    }
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage(): Observable<Language> {
    return this.currentLanguage$.asObservable();
  }

  /**
   * 获取当前语言代码
   */
  getCurrentLanguageSync(): Language {
    return this.currentLanguage$.value;
  }

  /**
   * 设置语言
   */
  setLanguage(language: Language): void {
    this.currentLanguage$.next(language);
    localStorage.setItem('picsur-language', language);
  }

  /**
   * 获取翻译文本
   */
  translate(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations[this.currentLanguage$.value];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // 如果找不到翻译，返回原始键
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  /**
   * 切换语言
   */
  toggleLanguage(): void {
    const current = this.getCurrentLanguageSync();
    const newLanguage = current === 'zh' ? 'en' : 'zh';
    this.setLanguage(newLanguage);
  }

  /**
   * 判断是否为中文
   */
  isChinese(): boolean {
    return this.getCurrentLanguageSync() === 'zh';
  }
}
