import { SysPreference } from 'picsur-shared/dist/dto/sys-preferences.enum';

export const SysPreferenceUI: {
  [key in SysPreference]: {
    name: string;
    helpText: string;
    category: string;
  };
} = {
  [SysPreference.HostOverride]: {
    name: '主机覆盖',
    helpText:
      '覆盖服务器的主机名，当您从不同域名访问服务器时很有用。',
    category: '常规',
  },

  [SysPreference.RemoveDerivativesAfter]: {
    name: '缓存图片过期时间',
    helpText:
      '缓存的转换图片被删除之前的时间。这不影响原始图片。较低的缓存时间将节省磁盘空间但消耗更多CPU。设置为0以禁用。',
    category: '图片处理',
  },
  [SysPreference.AllowEditing]: {
    name: '允许编辑图片',
    helpText:
      '允许编辑图片（例如调整大小、翻转）。使用这些功能将消耗更多CPU。',

    category: '图片处理',
  },
  [SysPreference.ConversionTimeLimit]: {
    name: '转换/编辑时间限制',
    helpText:
      '转换/编辑图片的时间限制。在低功耗设备上可能需要增加此值。',
    category: '图片处理',
  },
  [SysPreference.ConversionMemoryLimit]: {
    name: '转换/编辑内存限制 MB',
    helpText:
      '转换/编辑图片的内存限制。仅在存储大型图片时才需要增加此值。',
    category: '图片处理',
  },

  [SysPreference.JwtSecret]: {
    name: 'JWT密钥',
    helpText: '用于签名JWT认证令牌的密钥。',
    category: '认证',
  },
  [SysPreference.JwtExpiresIn]: {
    name: 'JWT过期时间',
    helpText: 'JWT认证令牌过期的时间。',
    category: '认证',
  },
  [SysPreference.BCryptStrength]: {
    name: 'BCrypt强度',
    helpText:
      'BCrypt哈希算法的强度，建议为10。在低功耗设备上运行时请减少此值。',
    category: '认证',
  },

};
