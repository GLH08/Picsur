import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DialogManagerModule } from '../../util/dialog-manager/dialog-manager.module';
import { ErrorManagerModule } from '../../util/error-manager/error-manager.module';
import { AlbumsComponent } from './albums.component';
import { AlbumDetailComponent } from './album-detail/album-detail.component';
import { AlbumsRoutingModule } from './albums.routing.module';

@NgModule({
  declarations: [AlbumsComponent, AlbumDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AlbumsRoutingModule,
    ErrorManagerModule,
    DialogManagerModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
})
export default class AlbumsModule {}
