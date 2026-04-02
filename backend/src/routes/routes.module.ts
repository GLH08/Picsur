import { Module } from '@nestjs/common';
import { PicsurApiModule } from './api/api.module.js';
import { AlbumModule } from './album/album.module.js';
import { ImageModule } from './image/image.module.js';

@Module({
  imports: [PicsurApiModule, ImageModule, AlbumModule],
})
export class PicsurRoutesModule {}
