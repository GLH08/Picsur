import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { SettingsApiDocsComponent } from './settings-api-docs.component';
import { SettingsApiDocsRoutingModule } from './settings-api-docs.routing.module';

@NgModule({
  declarations: [SettingsApiDocsComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    SettingsApiDocsRoutingModule,
  ],
})
export default class SettingsApiDocsModule {}
