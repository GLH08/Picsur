import { Controller, Get, Head, Logger, Param, Query, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import {
  ImageMetaResponse,
  ImageRequestParams,
} from 'picsur-shared/dist/dto/api/image.dto';
import { ImageEntryVariant } from 'picsur-shared/dist/dto/image-entry-variant.enum';
import { Ext2FileType, FileType2Mime } from 'picsur-shared/dist/dto/mimes.dto';
import {
  Fail,
  FT,
  HasFailed,
  IsFailure,
  ThrowIfFailed,
} from 'picsur-shared/dist/types/failable';
import { UserDbService } from '../../collections/user-db/user-db.service.js';
import { ImageFullIdParam } from '../../decorators/image-id/image-full-id.decorator.js';
import { ImageIdParam } from '../../decorators/image-id/image-id.decorator.js';
import { RequiredPermissions } from '../../decorators/permissions.decorator.js';
import { Returns } from '../../decorators/returns.decorator.js';
import { ImageManagerService } from '../../managers/image/image.service.js';
import type { ImageFullId } from '../../models/constants/image-full-id.const.js';
import { Permission } from '../../models/constants/permissions.const.js';
import { EUserBackend2EUser } from '../../models/transformers/user.transformer.js';
import { BrandMessageType, GetBrandMessage } from '../../util/branding.js';

// This is the only controller with CORS enabled
@Controller('i')
@RequiredPermissions(Permission.ImageView)
@SkipThrottle()
export class ImageController {
  private readonly logger = new Logger(ImageController.name);

  constructor(
    private readonly imagesService: ImageManagerService,
    private readonly userService: UserDbService,
  ) { }

  @Head(':id')
  async headImage(
    @Res({ passthrough: true }) res: FastifyReply,
    @ImageFullIdParam() fullid: ImageFullId,
  ) {
    if (fullid.variant === 'original') {
      const filetype = ThrowIfFailed(
        await this.imagesService.getOriginalFileType(fullid.id),
      );

      res.type(ThrowIfFailed(FileType2Mime(filetype.identifier)));
      return;
    }

    res.type(ThrowIfFailed(FileType2Mime(fullid.filetype)));
  }

  @Get(':date/:filename')
  async getImageWithDate(
    @Res({ passthrough: true }) res: FastifyReply,
    @Param('date') date: string,
    @Param('filename') filename: string,
    @Query() params: ImageRequestParams,
  ): Promise<Buffer> {
    // Extract ID from filename (assuming format: uuid.ext)
    const parts = filename.split('.');
    const id = parts[0];
    const ext = parts.length > 1 ? parts[parts.length - 1] : 'jpg';

    const filetypeRes = Ext2FileType(ext);
    const filetype = HasFailed(filetypeRes) ? 'image:jpeg' : filetypeRes;

    const fullid: ImageFullId = {
      id: id,
      filetype: filetype,
      variant: 'normal',
      ext: ext,
    };

    // Set Content-Disposition to inline for browser display
    res.header('Content-Disposition', 'inline');

    // Reuse existing logic
    return this.getImage(res, fullid, params);
  }

  @Get(':id')
  async getImage(
    // Usually passthrough is for manually sending the response,
    // But we need it here to set the mime type
    @Res({ passthrough: true }) res: FastifyReply,
    @ImageFullIdParam() fullid: ImageFullId,
    @Query() params: ImageRequestParams,
  ): Promise<Buffer> {
    // Set Content-Disposition to inline for browser display
    res.header('Content-Disposition', 'inline');

    try {
      if (fullid.variant === ImageEntryVariant.ORIGINAL) {
        const image = ThrowIfFailed(
          await this.imagesService.getOriginal(fullid.id),
        );

        res.type(ThrowIfFailed(FileType2Mime(image.filetype)));
        return image.data;
      }

      const image = ThrowIfFailed(
        await this.imagesService.getConverted(
          fullid.id,
          fullid.filetype,
          params,
        ),
      );

      res.type(ThrowIfFailed(FileType2Mime(image.filetype)));
      return image.data;
    } catch (e) {
      if (!IsFailure(e) || e.getType() !== FT.NotFound) throw e;

      const message = ThrowIfFailed(
        await GetBrandMessage(BrandMessageType.NotFound),
      );
      res.type(message.type);
      return message.data;
    }
  }

  @Get('thumb/:id')
  async getThumbnail(
    @Res({ passthrough: true }) res: FastifyReply,
    @ImageIdParam() id: string,
  ): Promise<Buffer> {
    // Set Content-Disposition to inline for browser display
    res.header('Content-Disposition', 'inline');

    try {
      // 优先返回 ORIGINAL（视频缩略图或图片原图）
      const original = await this.imagesService.getOriginal(id);
      if (!HasFailed(original)) {
        res.type(ThrowIfFailed(FileType2Mime(original.filetype)));
        return original.data;
      }

      // 如果没有 ORIGINAL，返回 MASTER（图片主文件）
      const master = await this.imagesService.getMaster(id);
      if (!HasFailed(master)) {
        res.type(ThrowIfFailed(FileType2Mime(master.filetype)));
        return master.data;
      }

      // 都没有就返回 404
      throw Fail(FT.NotFound, 'Image not found');
    } catch (e) {
      if (!IsFailure(e) || e.getType() !== FT.NotFound) throw e;

      const message = ThrowIfFailed(
        await GetBrandMessage(BrandMessageType.NotFound),
      );
      res.type(message.type);
      return message.data;
    }
  }

  @Get('meta/:id')
  @Returns(ImageMetaResponse)
  async getImageMeta(@ImageIdParam() id: string): Promise<ImageMetaResponse> {
    const image = ThrowIfFailed(await this.imagesService.findOne(id));

    const [fileMimesRes, imageUserRes] = await Promise.all([
      this.imagesService.getFileMimes(id),
      this.userService.findOne(image.user_id),
    ]);

    const fileTypes = ThrowIfFailed(fileMimesRes);
    const imageUser = ThrowIfFailed(imageUserRes);

    return { image, user: EUserBackend2EUser(imageUser), fileTypes };
  }
}
