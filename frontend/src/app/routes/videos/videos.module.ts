import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MomentModule } from 'ngx-moment';
import { PaginatorModule } from '../../components/paginator/paginator.module';
import { ShareDialogModule } from '../../components/share-dialog/share-dialog.module';
import { DialogManagerModule } from '../../util/dialog-manager/dialog-manager.module';
import { ErrorManagerModule } from '../../util/error-manager/error-manager.module';
import { VideosComponent } from './videos.component';
import { VideosRoutingModule } from './videos.routing.module';

@NgModule({
  declarations: [VideosComponent],
  imports: [
    CommonModule,
    FormsModule,
    ErrorManagerModule,
    DialogManagerModule,

    VideosRoutingModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PaginatorModule,
    MomentModule,
    ShareDialogModule,
  ],
})
export default class VideosRouteModule {}
