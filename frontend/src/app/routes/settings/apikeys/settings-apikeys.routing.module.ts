import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Permission } from 'picsur-shared/dist/dto/permissions.enum';
import { SettingsApiKeysComponent } from './settings-apikeys.component';
import { PermissionGuard } from '../../../guards/permission.guard';
import { PRoutes } from '../../../models/dto/picsur-routes.dto';

const routes: PRoutes = [
  {
    path: '',
    component: SettingsApiKeysComponent,
    canActivate: [PermissionGuard],
    data: {
      permissions: [Permission.ApiKey],
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsApiKeysRoutingModule { }
