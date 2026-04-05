import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'picsur-theme';
  private readonly forcedTheme: ThemeMode = 'light';
  private readonly themeModeSubject = new BehaviorSubject<ThemeMode>(
    this.forcedTheme,
  );

  public themeMode$ = this.themeModeSubject.asObservable();

  constructor() {
    this.applyTheme();
    this.persist();
  }

  get currentTheme(): ThemeMode {
    return this.forcedTheme;
  }

  getCurrentTheme(): ThemeMode {
    return this.forcedTheme;
  }

  get isDark(): boolean {
    return false;
  }

  setTheme(_mode: ThemeMode) {
    // Theme is forced to light-only; stored value is ignored but persisted for compatibility
    this.themeModeSubject.next(this.forcedTheme);
    this.applyTheme();
    this.persist();
  }

  private applyTheme() {
    document.documentElement.style.colorScheme = this.forcedTheme;
  }

  private persist() {
    localStorage.setItem(this.STORAGE_KEY, this.forcedTheme);
  }
}
