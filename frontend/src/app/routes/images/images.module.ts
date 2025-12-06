import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MomentModule } from 'ngx-moment';
import { MasonryModule } from '../../components/masonry/masonry.module';
import { PaginatorModule } from '../../components/paginator/paginator.module';
import { PicsurImgModule } from '../../components/picsur-img/picsur-img.module';
import { PipesModule } from '../../pipes/pipes.module';
import { ShareDialogModule } from '../../components/share-dialog/share-dialog.module';
import { AlbumPickerModule } from '../../components/album-picker/album-picker.module';
import { DialogManagerModule } from '../../util/dialog-manager/dialog-manager.module';
import { ErrorManagerModule } from '../../util/error-manager/error-manager.module';
import { ImagesComponent } from './images.component';
import { ImagesRoutingModule } from './images.routing.module';

@NgModule({
  declarations: [ImagesComponent],
  imports: [
    CommonModule,
    FormsModule,
    ErrorManagerModule,
    DialogManagerModule,

    ImagesRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MasonryModule,
    PaginatorModule,
    PicsurImgModule,
    MomentModule,
    PipesModule,
    ShareDialogModule,
    AlbumPickerModule,
  ],
})
export default class ImagesRouteModule {}
