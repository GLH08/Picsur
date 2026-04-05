import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { fileTypeFromBuffer, FileTypeResult } from 'file-type';
import { ImageRequestParams } from 'picsur-shared/dist/dto/api/image.dto';
import { ImageEntryVariant } from 'picsur-shared/dist/dto/image-entry-variant.enum';
import {
  AnimFileType,
  FileType,
  FileType2Ext,
  ImageFileType,
  Mime2FileType,
  SupportedFileTypeCategory,
  VideoFileType,
} from 'picsur-shared/dist/dto/mimes.dto';
import { SysPreference } from 'picsur-shared/dist/dto/sys-preferences.enum';
import {
  AsyncFailable,
  Fail,
  FT,
  HasFailed,
} from 'picsur-shared/dist/types/failable';
import { FindResult } from 'picsur-shared/dist/types/find-result';
import { ParseFileType } from 'picsur-shared/dist/util/parse-mime';
import { IsQOI } from 'qoi-img';
import { ImageDBService } from '../../collections/image-db/image-db.service.js';
import { ImageFileDBService } from '../../collections/image-db/image-file-db.service.js';
import { SysPreferenceDbService } from '../../collections/preference-db/sys-preference-db.service.js';
import { EImageDerivativeBackend } from '../../database/entities/images/image-derivative.entity.js';
import { EImageFileBackend } from '../../database/entities/images/image-file.entity.js';
import { EImageBackend } from '../../database/entities/images/image.entity.js';
import { MutexFallBack } from '../../util/mutex-fallback.js';
import { ImageConverterService } from './image-converter.service.js';
import { ImageProcessorService } from './image-processor.service.js';
import { VideoThumbnailService } from './video-thumbnail.service.js';
import { WebPInfo } from './webpinfo/webpinfo.js';

@Injectable()
export class ImageManagerService {
  private readonly logger = new Logger(ImageManagerService.name);

  constructor(
    private readonly imagesService: ImageDBService,
    private readonly imageFilesService: ImageFileDBService,
    private readonly processService: ImageProcessorService,
    private readonly convertService: ImageConverterService,
    private readonly sysPref: SysPreferenceDbService,
    private readonly videoThumbnailService: VideoThumbnailService,
  ) { }

  public async findOne(id: string): AsyncFailable<EImageBackend> {
    return await this.imagesService.findOne(id, undefined);
  }

  public async findMany(
    count: number,
    page: number,
    userid: string | undefined,
    type: 'all' | 'image' | 'video' = 'all',
  ): AsyncFailable<FindResult<EImageBackend>> {
    // If filtering by type, get all results and filter
    if (type !== 'all') {
      return await this.filterByType(count, page, userid, type);
    }
    return await this.imagesService.findMany(count, page, userid);
  }

  /**
   * Filter images/videos by master file type
   */
  private async filterByType(
    count: number,
    page: number,
    userid: string | undefined,
    type: 'image' | 'video',
  ): AsyncFailable<FindResult<EImageBackend>> {
    // 获取用户的总图片数量
    const totalImages = await this.imagesService.count();
    if (HasFailed(totalImages)) return totalImages;

    // 获取所有图片进行过滤（需要获取全部才能按类型过滤）
    // 但限制获取数量避免超时
    const maxFetch = Math.min(totalImages, 500);
    const allImages = await this.imagesService.findMany(maxFetch, 0, userid);
    if (HasFailed(allImages)) return allImages;

    // Filter by file type
    const filteredImages: EImageBackend[] = [];
    for (const image of allImages.results) {
      const fileTypes = await this.imageFilesService.getFileTypes(image.id);
      if (HasFailed(fileTypes)) continue;

      const masterType = fileTypes['master'];
      if (!masterType) continue;

      const parsed = ParseFileType(masterType);
      if (HasFailed(parsed)) continue;

      if (type === 'video' && parsed.category === SupportedFileTypeCategory.Video) {
        filteredImages.push(image);
      } else if (type === 'image' && parsed.category !== SupportedFileTypeCategory.Video) {
        filteredImages.push(image);
      }
    }

    // Paginate filtered results
    const total = filteredImages.length;
    const start = count * page;
    const end = start + count;
    const paginatedResults = filteredImages.slice(start, end);

    return {
      results: paginatedResults,
      total,
      page,
      pages: Math.ceil(total / count) || 1,
    };
  }

  public async update(
    id: string,
    userid: string | undefined,
    options: Partial<Pick<EImageBackend, 'file_name' | 'expires_at'>>,
  ): AsyncFailable<EImageBackend> {
    if (options.expires_at !== undefined && options.expires_at !== null) {
      if (options.expires_at < new Date()) {
        return Fail(FT.UsrValidation, 'Expiration date must be in the future');
      }
    }
    return await this.imagesService.update(id, userid, options);
  }

  public async deleteMany(
    ids: string[],
    userid: string | undefined,
  ): AsyncFailable<EImageBackend[]> {
    return await this.imagesService.delete(ids, userid);
  }

  public async deleteWithKey(
    imageId: string,
    key: string,
  ): AsyncFailable<EImageBackend> {
    return await this.imagesService.deleteWithKey(imageId, key);
  }

  public async upload(
    userid: string,
    filename: string,
    image: Buffer,
    withDeleteKey: boolean,
  ): AsyncFailable<EImageBackend> {
    const fileType = await this.getFileTypeFromBuffer(image);
    if (HasFailed(fileType)) return fileType;

    // Process
    const processResult = await this.processService.process(image, fileType);
    if (HasFailed(processResult)) return processResult;

    // Strip extension from filename
    const name = (() => {
      const index = filename.lastIndexOf('.');
      if (index === -1) return filename;
      return filename.substring(0, index);
    })();

    // Save processed to db
    const imageEntity = await this.imagesService.create(
      userid,
      name,
      withDeleteKey,
    );
    if (HasFailed(imageEntity)) return imageEntity;

    // Date based folder logic
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const uploadDir = `/app/uploads/${dateStr}`;

    try {
      const fs = await import('fs/promises');
      await fs.mkdir(uploadDir, { recursive: true });

      // Save MASTER
      const extRes = FileType2Ext(processResult.filetype);
      const masterExt = HasFailed(extRes) ? 'bin' : extRes;
      const masterPath = `${uploadDir}/${imageEntity.id}.${masterExt}`;
      await fs.writeFile(masterPath, processResult.image);

      const imageFileEntity = await this.imageFilesService.setFile(
        imageEntity.id,
        ImageEntryVariant.MASTER,
        processResult.image,
        processResult.filetype,
        masterPath,
      );
      if (HasFailed(imageFileEntity)) return imageFileEntity;

      // Generate thumbnail for videos
      if (fileType.category === SupportedFileTypeCategory.Video) {
        await this.generateVideoThumbnail(imageEntity.id, masterPath);
      }
    } catch (e) {
      return Fail(FT.Internal, `Failed to save file to disk: ${e}`);
    }

    return imageEntity;
  }

  /**
   * 为视频生成缩略图
   */
  private async generateVideoThumbnail(
    imageId: string,
    videoPath: string,
  ): AsyncFailable<void> {
    try {
      // 缩略图存储在同名 .thumb.jpg 文件
      const thumbnailPath = videoPath + '.thumb.jpg';

      const thumbnail = await this.videoThumbnailService.generateThumbnail(
        videoPath,
        thumbnailPath,
      );

      if (HasFailed(thumbnail)) {
        this.logger.warn(`Failed to generate thumbnail for ${imageId}: ${thumbnail.getReason()}`);
        return; // 不影响主流程
      }

      // 将缩略图存储为视频的 ORIGINAL variant (复用现有 variant)
      // 或者可以使用 derivative 存储
      const fs = await import('fs/promises');
      const thumbnailData = await fs.readFile(thumbnailPath);

      // 使用 setFile 将缩略图存储为 ORIGINAL variant
      const result = await this.imageFilesService.setFile(
        imageId,
        ImageEntryVariant.ORIGINAL,
        thumbnailData,
        ImageFileType.JPEG,
        thumbnailPath,
      );

      if (HasFailed(result)) {
        this.logger.warn(`Failed to save thumbnail for ${imageId}: ${result.getReason()}`);
        return;
      }

      this.logger.log(`Generated and saved thumbnail for video: ${imageId}`);
    } catch (e) {
      // 缩略图生成失败不影响主流程
      this.logger.warn(`Error generating thumbnail for ${imageId}: ${e}`);
    }
  }

  public async getConverted(
    imageId: string,
    fileType: string,
    options: ImageRequestParams,
  ): AsyncFailable<EImageDerivativeBackend> {
    const targetFileType = ParseFileType(fileType);
    if (HasFailed(targetFileType)) return targetFileType;

    // Check if the source is a video - videos cannot be converted
    const masterFileType = await this.getMasterFileType(imageId);
    if (HasFailed(masterFileType)) return masterFileType;
    if (masterFileType.category === SupportedFileTypeCategory.Video) {
      // Videos are served as-is from master (no conversion)
      const master = await this.getMaster(imageId);
      if (HasFailed(master)) return master;

      // Return master as a derivative-like result
      const derivative = new EImageDerivativeBackend();
      derivative.image_id = imageId;
      derivative.key = fileType;
      derivative.filetype = master.filetype;
      derivative.data = master.data;
      derivative.last_read = new Date();
      return derivative;
    }

    const converted_key = this.getConvertHash({ mime: fileType, ...options });

    const allow_editing = await this.sysPref.getBooleanPreference(
      SysPreference.AllowEditing,
    );
    if (HasFailed(allow_editing)) return allow_editing;

    return MutexFallBack(
      converted_key,
      () => {
        return this.imageFilesService.getDerivative(imageId, converted_key);
      },
      async () => {
        const masterImage = await this.getMaster(imageId);
        if (HasFailed(masterImage)) return masterImage;

        const sourceFileType = ParseFileType(masterImage.filetype);
        if (HasFailed(sourceFileType)) return sourceFileType;

        const startTime = Date.now();
        const convertResult = await this.convertService.convert(
          masterImage.data,
          sourceFileType,
          targetFileType,
          allow_editing ? options : {},
        );
        if (HasFailed(convertResult)) return convertResult;

        this.logger.verbose(
          `Converted ${imageId} from ${sourceFileType.identifier} to ${targetFileType.identifier
          } in ${Date.now() - startTime}ms`,
        );

        return await this.imageFilesService.addDerivative(
          imageId,
          converted_key,
          convertResult.filetype,
          convertResult.image,
        );
      },
    );
  }

  // File getters ==============================================================

  public async getMaster(imageId: string): AsyncFailable<EImageFileBackend> {
    return this.imageFilesService.getFile(imageId, ImageEntryVariant.MASTER);
  }

  public async getMasterLazy(imageId: string): AsyncFailable<EImageFileBackend> {
    return this.imageFilesService.getFileLazy(imageId, ImageEntryVariant.MASTER);
  }

  public async getMasterFileType(imageId: string): AsyncFailable<FileType> {
    const mime = await this.imageFilesService.getFileTypes(imageId);
    if (HasFailed(mime)) return mime;

    if (mime['master'] === undefined)
      return Fail(FT.NotFound, 'No master file');

    return ParseFileType(mime['master']);
  }

  public async getOriginal(imageId: string): AsyncFailable<EImageFileBackend> {
    return this.imageFilesService.getFile(imageId, ImageEntryVariant.ORIGINAL);
  }

  public async getOriginalLazy(imageId: string): AsyncFailable<EImageFileBackend> {
    return this.imageFilesService.getFileLazy(imageId, ImageEntryVariant.ORIGINAL);
  }

  public async getOriginalFileType(imageId: string): AsyncFailable<FileType> {
    const filetypes = await this.imageFilesService.getFileTypes(imageId);
    if (HasFailed(filetypes)) return filetypes;

    if (filetypes['original'] === undefined)
      return Fail(FT.NotFound, 'No original file');

    return ParseFileType(filetypes['original']);
  }

  public async getFileMimes(imageId: string): AsyncFailable<{
    [ImageEntryVariant.MASTER]: string;
    [ImageEntryVariant.ORIGINAL]: string | undefined;
  }> {
    const result = await this.imageFilesService.getFileTypes(imageId);
    if (HasFailed(result)) return result;

    if (result[ImageEntryVariant.MASTER] === undefined) {
      return Fail(FT.NotFound, 'No master file found');
    }

    return {
      [ImageEntryVariant.MASTER]: result[ImageEntryVariant.MASTER],
      [ImageEntryVariant.ORIGINAL]: result[ImageEntryVariant.ORIGINAL],
    };
  }

  // Util stuff ==================================================================

  private async getFileTypeFromBuffer(image: Buffer): AsyncFailable<FileType> {
    const filetypeResult: FileTypeResult | undefined =
      await fileTypeFromBuffer(image);

    let mime: string | undefined;
    if (filetypeResult === undefined) {
      if (IsQOI(image)) mime = 'image/x-qoi';
    } else {
      mime = filetypeResult.mime;
    }

    if (mime === undefined) mime = 'other/unknown';

    let filetype: string | undefined;
    if (mime === 'image/webp') {
      const header = await WebPInfo.from(image);
      if (header.summary.isAnimated) filetype = AnimFileType.WEBP;
      else filetype = ImageFileType.WEBP;
    }
    if (filetype === undefined) {
      // Try to match as video MIME type
      filetype = this.mimeToVideoFileType(mime);
    }
    if (filetype === undefined) {
      const parsed = Mime2FileType(mime);
      if (HasFailed(parsed)) return parsed;
      filetype = parsed;
    }

    return ParseFileType(filetype);
  }

  private mimeToVideoFileType(mime: string): string | undefined {
    const videoMimeMap: Record<string, string> = {
      'video/mp4': VideoFileType.MP4,
      'video/webm': VideoFileType.WEBM,
      'video/quicktime': VideoFileType.MOV,
      'video/x-msvideo': VideoFileType.AVI,
      'video/x-matroska': VideoFileType.MKV,
      'video/ogg': VideoFileType.OGV,
    };
    return videoMimeMap[mime];
  }

  private getConvertHash(options: object) {
    // Return a sha256 hash of the stringified options
    const stringified = JSON.stringify(options);
    const hash = createHash('sha256');
    hash.update(stringified);
    const digest = hash.digest('hex');
    return digest;
  }
}
