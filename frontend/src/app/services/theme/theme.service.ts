import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'dark' | 'light' | 'system';

/** 主题切换动画持续时间（毫秒） */
const THEME_TRANSITION_DURATION = 300;

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'picsur-theme';
  private themeModeSubject = new BehaviorSubject<ThemeMode>(this.getStoredTheme());

  public themeMode$ = this.themeModeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeModeSubject.value);
    this.watchSystemTheme();
  }

  get currentTheme(): ThemeMode {
    return this.themeModeSubject.value;
  }

  getCurrentTheme(): string {
    const mode = this.themeModeSubject.value;
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }

  get isDark(): boolean {
    const mode = this.themeModeSubject.value;
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return mode === 'dark';
  }

  setTheme(mode: ThemeMode) {
    this.themeModeSubject.next(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.applyThemeWithTransition(mode);
  }

  toggleTheme() {
    const current = this.themeModeSubject.value;
    if (current === 'dark') {
      this.setTheme('light');
    } else if (current === 'light') {
      this.setTheme('system');
    } else {
      this.setTheme('dark');
    }
  }

  private getStoredTheme(): ThemeMode {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
    return 'dark'; // 默认深色
  }

  /**
   * 带动画的主题应用
   */
  private applyThemeWithTransition(mode: ThemeMode) {
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const targetClass = isDark ? 'theme-dark' : 'theme-light';

    // 添加过渡类
    document.body.classList.add('theme-transition');

    // 应用主题
    this.applyTheme(mode);

    // 动画结束后移除过渡类
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, THEME_TRANSITION_DURATION);
  }

  private applyTheme(mode: ThemeMode) {
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
  }

  private watchSystemTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.themeModeSubject.value === 'system') {
        this.applyThemeWithTransition('system');
      }
    });
  }
}
