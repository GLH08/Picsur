import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SettingsApiDocsComponent } from './settings-api-docs.component';
import { PRoutes } from '../../../models/dto/picsur-routes.dto';

const routes: PRoutes = [
  {
    path: '',
    component: SettingsApiDocsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsApiDocsRoutingModule {}
