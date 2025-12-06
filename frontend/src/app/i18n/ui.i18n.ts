// UI界面中文翻译
export const UI_TEXT_ZH = {
  // 通用
  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    update: '更新',
    search: '搜索',
    filter: '筛选',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '关闭',
    copy: '复制',
    view: '查看',
    upload: '上传',
    download: '下载',
  },

  // 导航和布局
  nav: {
    uploadImage: '上传图片',
    loginOrRegister: '登录或注册',
    loginToAccount: '登录到您的账户',
    myImages: '我的图片',
    settings: '设置',
    logout: '退出登录',
    yourAccount: '您的账户',
  },

  // 页脚
  footer: {
    demoVersion: ' - 演示版本',
  },

  // 认证页面
  auth: {
    login: {
      title: '登录到您的账户',
      username: '用户名',
      password: '密码',
      button: '登录',
      registerButton: '注册',
    },
    register: {
      title: '注册新账户',
      username: '用户名',
      password: '密码',
      confirmPassword: '确认密码',
      button: '注册',
      loginButton: '登录',
    },
  },

  // 上传页面
  upload: {
    title: '上传图片',
    description: '拖拽、粘贴或点击选择图片',
    pleaseLogin: '请登录',
    noPermission: '您还没有上传权限',
  },

  // 图片列表页面
  images: {
    title: '您的图片',
    noImages: '没有可显示的图片',
    uploaded: '上传于',
    expires: '过期时间',
    viewButton: '查看',
    deleteButton: '删除',
  },

  // 图片查看页面
  view: {
    uploadedBy: '由',
    uploadedAt: '上传于',
    expiresAt: '过期时间',
    imageUrl: '图片链接',
    imageFormat: '图片格式',
    markdown: 'Markdown',
    html: 'HTML',
    bbcode: 'BBCode',
    rst: 'RST',
    imageUploadedByYou: '您上传的图片',
  },

  // 设置页面
  settings: {
    title: '设置',
    personal: '个人',
    system: '系统',
    general: '常规',
    apiKeys: 'API密钥',
    roles: '角色',
    users: '用户',
    sharex: 'ShareX',
    sysPref: '系统偏好',
    created: '创建时间',
    lastUsed: '最后使用',
    actions: '操作',
    addApiKey: '添加API密钥',
    createNewApiKey: '创建新的API密钥',
    never: '从未',
  },

  // 权限和偏好
  permissions: {
    imageView: '查看图片',
    imageUpload: '上传图片',
    imageManage: '管理自己的图片',
    imageDeleteKey: '使用删除密钥',
    userLogin: '登录',
    userKeepLogin: '保持登录',
    userRegister: '注册',
    settings: '查看设置',
    apiKey: '使用API密钥',
    imageAdmin: '图片管理员',
    userAdmin: '用户管理员',
    roleAdmin: '角色管理员',
    apiKeyAdmin: 'API密钥管理员',
    sysPrefAdmin: '系统管理员',
  },

  sysPreferences: {
    hostOverride: {
      name: '主机覆盖',
      helpText: '覆盖服务器的主机名，当您从不同域名访问服务器时很有用。',
    },
    removeDerivativesAfter: {
      name: '缓存图片过期时间',
      helpText: '缓存的转换图片被删除之前的时间。这不影响原始图片。较低的缓存时间将节省磁盘空间但消耗更多CPU。设置为0以禁用。',
    },
    allowEditing: {
      name: '允许编辑图片',
      helpText: '允许编辑图片（例如调整大小、翻转）。使用这些功能将消耗更多CPU。',
    },
    conversionTimeLimit: {
      name: '转换/编辑时间限制',
      helpText: '转换/编辑图片的时间限制。在低功耗设备上可能需要增加此值。',
    },
    conversionMemoryLimit: {
      name: '转换/编辑内存限制 MB',
      helpText: '转换/编辑图片的内存限制。仅在存储大型图片时才需要增加此值。',
    },
    jwtSecret: {
      name: 'JWT密钥',
      helpText: '用于签名JWT认证令牌的密钥。',
    },
    jwtExpiresIn: {
      name: 'JWT过期时间',
      helpText: 'JWT认证令牌过期的时间。',
    },
    bcryptStrength: {
      name: 'BCrypt强度',
      helpText: 'BCrypt哈希算法的强度，建议为10。在低功耗设备上运行时请减少此值。',
    },
    categories: {
      general: '常规',
      imageProcessing: '图片处理',
      authentication: '认证',
      usage: '使用情况',
    },
  },

  userPreferences: {},

  // 错误页面
  errors: {
    notFound: '页面未找到',
    unauthorized: '未授权',
    forbidden: '禁止访问',
    serverError: '服务器错误',
    goHome: '返回首页',
  },
};

// 系统偏好类别翻译
export const SysPreferenceCategories: { [key: string]: string } = {
  General: '常规',
  'Image Processing': '图片处理',
  Authentication: '认证',
  Usage: '使用情况',
};
