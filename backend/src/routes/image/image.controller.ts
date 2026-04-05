import { Controller, Get, Head, Logger, Param, Query, Res, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createReadStream, statSync } from 'fs';
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

function sendFileSmart(res: FastifyReply, req: FastifyRequest, fileEntity: any, mime: string) {
  if (fileEntity.path) {
    try {
      const stat = statSync(fileEntity.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      res.header('Accept-Ranges', 'bytes');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || start > end || start < 0) {
          res.status(416).header('Content-Range', `bytes */${fileSize}`).send();
          return;
        }

        const chunksize = end - start + 1;
        const file = createReadStream(fileEntity.path, { start, end });
        res
          .status(206)
          .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
          .header('Content-Length', chunksize)
          .type(mime)
          .send(file);
        return;
      } else {
        res
          .header('Content-Length', fileSize)
          .type(mime)
          .send(createReadStream(fileEntity.path));
        return;
      }
    } catch(e) {
      console.error('Failed to send file with range support, falling back to direct send:', e);
    }
  }
  
  if (fileEntity.data) {
    res.type(mime).send(fileEntity.data);
  } else {
    res.status(404).send('Not Found');
  }
}


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
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Param('date') date: string,
    @Param('filename') filename: string,
    @Query() params: ImageRequestParams,
  ): Promise<void> {
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
    return this.getImage(req, res, fullid, params);
  }

  @Get(':id')
  async getImage(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @ImageFullIdParam() fullid: ImageFullId,
    @Query() params: ImageRequestParams,
  ): Promise<void> {
    // Set Content-Disposition to inline for browser display
    res.header('Content-Disposition', 'inline');

    try {
      if (fullid.variant === ImageEntryVariant.ORIGINAL) {
        const image = ThrowIfFailed(
          await this.imagesService.getOriginalLazy(fullid.id),
        );

        sendFileSmart(res, req, image, ThrowIfFailed(FileType2Mime(image.filetype)));
        return;
      }

      // Check if this is a video. If so, return master lazily!
      const masterType = ThrowIfFailed(await this.imagesService.getMasterFileType(fullid.id));
      if (masterType.category === 'video') {
         const image = ThrowIfFailed(await this.imagesService.getMasterLazy(fullid.id));
         sendFileSmart(res, req, image, ThrowIfFailed(FileType2Mime(image.filetype)));
         return;
      }

      const image = ThrowIfFailed(
        await this.imagesService.getConverted(
          fullid.id,
          fullid.filetype,
          params,
        ),
      );

      sendFileSmart(res, req, image, ThrowIfFailed(FileType2Mime(image.filetype)));
      return;
    } catch (e) {
      if (!IsFailure(e) || e.getType() !== FT.NotFound) throw e;

      const message = ThrowIfFailed(
        await GetBrandMessage(BrandMessageType.NotFound),
      );
      res.type(message.type).send(message.data);
      return;
    }
  }

  @Get('thumb/:id')
  async getThumbnail(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @ImageIdParam() id: string,
  ): Promise<void> {
    // Set Content-Disposition to inline for browser display
    res.header('Content-Disposition', 'inline');

    try {
      // 优先返回 ORIGINAL（视频缩略图或图片原图）
      const original = await this.imagesService.getOriginalLazy(id);
      if (!HasFailed(original)) {
        sendFileSmart(res, req, original, ThrowIfFailed(FileType2Mime(original.filetype)));
        return;
      }

      // 如果没有 ORIGINAL，返回 MASTER（图片主文件）
      const master = await this.imagesService.getMasterLazy(id);
      if (!HasFailed(master)) {
        sendFileSmart(res, req, master, ThrowIfFailed(FileType2Mime(master.filetype)));
        return;
      }

      // 都没有就返回 404
      throw Fail(FT.NotFound, 'Image not found');
    } catch (e) {
      if (!IsFailure(e) || e.getType() !== FT.NotFound) throw e;

      const message = ThrowIfFailed(
        await GetBrandMessage(BrandMessageType.NotFound),
      );
      res.type(message.type).send(message.data);
      return;
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
