import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { E401Component } from './401.component';
import { E404Component } from './404.component';
import { ImageDeleteFailureComponent } from './delete-failure.component';
import { ImageDeleteSuccessComponent } from './delete-success.component';
import { ErrorsRoutingModule } from './errors.routing.module';

@NgModule({
  declarations: [
    E404Component,
    E401Component,
    ImageDeleteSuccessComponent,
    ImageDeleteFailureComponent,
  ],
  imports: [CommonModule, RouterModule, ErrorsRoutingModule],
})
export default class ErrorsRouteModule {}
