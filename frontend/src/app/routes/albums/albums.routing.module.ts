import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlbumsComponent } from './albums.component';
import { AlbumDetailComponent } from './album-detail/album-detail.component';

const routes: Routes = [
  {
    path: '',
    component: AlbumsComponent,
    data: {
      title: '我的相册',
    },
  },
  {
    path: ':id',
    component: AlbumDetailComponent,
    data: {
      title: '相册详情',
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AlbumsRoutingModule {}
