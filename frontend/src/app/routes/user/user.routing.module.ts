import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Permission } from 'picsur-shared/dist/dto/permissions.enum';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { PermissionGuard } from '../../guards/permission.guard';
import { PRoutes } from '../../models/dto/picsur-routes.dto';

const routes: PRoutes = [
  {
    path: 'login',
    component: LoginComponent,
    // Login page should be publicly accessible, no PermissionGuard needed
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [Permission.UserRegister] },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
