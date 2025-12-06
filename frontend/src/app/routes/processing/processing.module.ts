import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProcessingComponent } from './processing.component';
import { ProcessingRoutingModule } from './processing.routing.module';
import { ErrorManagerModule } from '../../util/error-manager/error-manager.module';

@NgModule({
  declarations: [ProcessingComponent],
  imports: [
    CommonModule,
    ErrorManagerModule,
    ProcessingRoutingModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export default class ProcessingRouteModule {}
