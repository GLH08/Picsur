import { Component, OnInit } from '@angular/core';
import { DecodedPref } from 'picsur-shared/dist/dto/preferences.dto';
import { Observable } from 'rxjs';
import {
  UsrPreferenceFriendlyNames,
  UsrPreferenceHelpText,
} from '../../../i18n/usr-pref.i18n';
import { UsrPrefService } from '../../../services/api/usr-pref.service';
import { UserService } from '../../../services/api/user.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { ErrorService } from '../../../util/error-manager/error.service';
import { StorageService, STORAGE_CONFIGS } from '../../../services/storage/storage.service';
import { Logger } from '../../../services/logger/logger.service';

// 用户设置接口
interface UserSettings {
  copyFormat: string;
  gridColumns: number;
  autoUploadClipboard: boolean;
  confirmDelete: boolean;
}

@Component({
  templateUrl: './settings-general.component.html',
  styleUrls: ['./settings-general.component.scss'],
})
export class SettingsGeneralComponent implements OnInit {
  private readonly logger: Logger = new Logger(SettingsGeneralComponent.name);
  private readonly translator = UsrPreferenceFriendlyNames;
  private readonly helpTranslator = UsrPreferenceHelpText;

  preferences: Observable<DecodedPref[]>;
  currentTheme = 'dark';
  username = '';
  userRoles: string[] = [];

  // 用户设置
  settings: UserSettings = {
    copyFormat: 'url',
    gridColumns: 4,
    autoUploadClipboard: false,
    confirmDelete: true,
  };

  constructor(
    public readonly usrPrefService: UsrPrefService,
    private readonly userService: UserService,
    private readonly themeService: ThemeService,
    private readonly errorService: ErrorService,
    private readonly storageService: StorageService,
  ) {
    this.preferences = usrPrefService.live;
  }

  ngOnInit() {
    // 获取当前主题
    this.currentTheme = this.themeService.getCurrentTheme();
    
    // 获取用户信息
    const user = this.userService.snapshot;
    if (user) {
      this.username = user.username;
      this.userRoles = user.roles || [];
    }

    // 从 localStorage 加载设置
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = this.storageService.get<UserSettings>(STORAGE_CONFIGS.USER_SETTINGS);
      if (saved) {
        this.settings = { ...this.settings, ...saved };
      }
    } catch (e) {
      this.logger.warn('Failed to parse saved settings');
    }
  }

  private saveSettings() {
    this.storageService.set(STORAGE_CONFIGS.USER_SETTINGS, this.settings);
    this.errorService.success('设置已保存');
  }

  public getName(key: string) {
    return (this.translator as any)[key] ?? key;
  }

  public getHelpText(key: string) {
    return (this.helpTranslator as any)[key] ?? '';
  }

  onThemeChange(theme: string) {
    this.currentTheme = theme;
    this.themeService.setTheme(theme as 'dark' | 'light');
  }

  onCopyFormatChange(format: string) {
    this.settings.copyFormat = format;
    this.saveSettings();
  }

  onGridColumnsChange(value: number) {
    this.settings.gridColumns = value;
    this.saveSettings();
  }

  onAutoUploadClipboardChange(value: boolean) {
    this.settings.autoUploadClipboard = value;
    this.saveSettings();
  }

  onConfirmDeleteChange(value: boolean) {
    this.settings.confirmDelete = value;
    this.saveSettings();
  }

  resetSettings() {
    this.settings = {
      copyFormat: 'url',
      gridColumns: 4,
      autoUploadClipboard: false,
      confirmDelete: true,
    };
    this.saveSettings();
    this.errorService.success('设置已重置为默认值');
  }
}
