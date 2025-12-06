import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SettingsGeneralComponent } from './settings-general.component';
import { SettingsGeneralRoutingModule } from './settings-general.routing.module';
import { PrefOptionModule } from '../../../components/pref-option/pref-option.module';
import { ErrorManagerModule } from '../../../util/error-manager/error-manager.module';

@NgModule({
  declarations: [SettingsGeneralComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatSlideToggleModule,
    SettingsGeneralRoutingModule,
    PrefOptionModule,
    ErrorManagerModule,
  ],
})
export default class SettingsGeneralRouteModule {}
