import { Module } from '@nestjs/common';
import { AlbumDBModule } from '../../collections/album-db/album-db.module.js';
import { DecoratorsModule } from '../../decorators/decorators.module.js';
import { AlbumController } from './album.controller.js';

@Module({
  imports: [AlbumDBModule, DecoratorsModule],
  controllers: [AlbumController],
})
export class AlbumModule {}
