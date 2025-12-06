import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Permission } from 'picsur-shared/dist/dto/permissions.enum';
import { SettingsSidebarComponent } from './sidebar/settings-sidebar.component';
import { PermissionGuard } from '../../guards/permission.guard';
import { PRoutes } from '../../models/dto/picsur-routes.dto';
import { SidebarResolverService } from '../../services/sidebar-resolver/sidebar-resolver.service';

const SettingsRoutes: PRoutes = [
  {
    path: '',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'general',
      },
      {
        path: 'general',
        loadChildren: () =>
          import('./general/settings-general.module').then((m) => m.default),
        data: {
          permissions: [Permission.Settings],
          page: {
            title: '常规',
            icon: 'settings',
            category: 'personal',
          },
        },
      },
      {
        path: 'apikeys',
        loadChildren: () =>
          import('./apikeys/settings-apikeys.module').then((m) => m.default),
        data: {
          permissions: [Permission.ApiKey],
          page: {
            title: 'API密钥',
            icon: 'key',
            category: 'personal',
          },
        },
      },
      {
        path: 'api-docs',
        loadChildren: () =>
          import('./api-docs/settings-api-docs.module').then((m) => m.default),
        data: {
          permissions: [Permission.ApiKey],
          page: {
            title: 'API文档',
            icon: 'description',
            category: 'personal',
          },
        },
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./users/settings-users.module').then((m) => m.default),
        data: {
          permissions: [Permission.UserAdmin],
          page: {
            title: '用户',
            icon: 'people_outline',
            category: 'system',
          },
        },
      },
      {
        path: 'roles',
        loadChildren: () =>
          import('./roles/settings-roles.module').then((m) => m.default),
        data: {
          permissions: [Permission.RoleAdmin],
          page: {
            title: '角色',
            icon: 'admin_panel_settings',
            category: 'system',
          },
        },
      },
      {
        path: 'system',
        loadChildren: () =>
          import('./sys-pref/settings-sys-pref.module').then((m) => m.default),
        data: {
          permissions: [Permission.SysPrefAdmin],
          page: {
            title: '系统设置',
            icon: 'tune',
            category: 'system',
          },
        },
      },
    ],
    canActivate: [PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      sidebar: SettingsSidebarComponent,
    },
    resolve: SidebarResolverService.build(),
  },
];

@NgModule({
  imports: [RouterModule.forChild(SettingsRoutes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {
  static forRoot(): ModuleWithProviders<SettingsRoutingModule> {
    return {
      ngModule: SettingsRoutingModule,
      providers: [
        {
          provide: 'SettingsRoutes',
          useFactory: () => SettingsRoutes[0].children,
        },
      ],
    };
  }
}
