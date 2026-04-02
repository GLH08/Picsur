import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EAlbumBackend } from '../../database/entities/album.entity.js';
import { EAlbumImageBackend } from '../../database/entities/album-image.entity.js';
import { AlbumDBService } from './album-db.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([EAlbumBackend, EAlbumImageBackend])],
  providers: [AlbumDBService],
  exports: [AlbumDBService],
})
export class AlbumDBModule {}
