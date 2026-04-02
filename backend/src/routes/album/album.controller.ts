import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  AlbumAddImagesRequest,
  AlbumCreateRequest,
  AlbumListResponse,
  AlbumRemoveImagesRequest,
  AlbumUpdateRequest,
} from 'picsur-shared/dist/dto/api/album.dto';
import { Permission } from 'picsur-shared/dist/dto/permissions.enum';
import { HasFailed, ThrowIfFailed } from 'picsur-shared/dist/types/failable';
import { RequiredPermissions } from '../../decorators/permissions.decorator.js';
import { ReqUserID } from '../../decorators/request-user.decorator.js';
import { Returns } from '../../decorators/returns.decorator.js';
import { AlbumDBService } from '../../collections/album-db/album-db.service.js';

@Controller('api/album')
@RequiredPermissions(Permission.ImageView)
export class AlbumController {
  private readonly logger = new Logger(AlbumController.name);

  constructor(private readonly albumService: AlbumDBService) {}

  @Post()
  @Returns(AlbumListResponse)
  async createAlbum(
    @Body() dto: AlbumCreateRequest,
    @ReqUserID() userid: string,
  ) {
    const album = ThrowIfFailed(
      await this.albumService.create(userid, dto.name, dto.description),
    );

    return {
      results: [album],
    };
  }

  @Get()
  @Returns(AlbumListResponse)
  async listAlbums(@ReqUserID() userid: string) {
    const albums = ThrowIfFailed(await this.albumService.findAll(userid));
    return { results: albums };
  }

  @Put()
  @Returns(AlbumListResponse)
  async updateAlbum(
    @Body() dto: AlbumUpdateRequest,
    @ReqUserID() userid: string,
  ) {
    const album = ThrowIfFailed(
      await this.albumService.update(dto.id, userid, {
        name: dto.name,
        description: dto.description,
        cover_url: dto.cover_url,
      }),
    );

    return { results: [album] };
  }

  @Delete(':id')
  async deleteAlbum(@Param('id') id: string, @ReqUserID() userid: string) {
    const result = await this.albumService.delete(id, userid);
    if (HasFailed(result)) {
      ThrowIfFailed(result);
    }
    return { success: true };
  }

  @Post('add-images')
  @Returns(AlbumListResponse)
  async addImages(
    @Body() dto: AlbumAddImagesRequest,
    @ReqUserID() userid: string,
  ) {
    const album = ThrowIfFailed(
      await this.albumService.addImages(dto.album_id, userid, dto.image_ids),
    );
    return { results: [album] };
  }

  @Post('remove-images')
  @Returns(AlbumListResponse)
  async removeImages(
    @Body() dto: AlbumRemoveImagesRequest,
    @ReqUserID() userid: string,
  ) {
    const album = ThrowIfFailed(
      await this.albumService.removeImages(dto.album_id, userid, dto.image_ids),
    );
    return { results: [album] };
  }
}
