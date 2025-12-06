import { Injectable } from '@angular/core';
import {
  ImageDeleteRequest,
  ImageDeleteResponse,
  ImageListRequest,
  ImageListResponse,
  ImageUpdateRequest,
  ImageUpdateResponse,
  ImageUploadResponse,
} from 'picsur-shared/dist/dto/api/image-manage.dto';
import {
  ImageMetaResponse,
  ImageRequestParams,
} from 'picsur-shared/dist/dto/api/image.dto';
import { ImageLinks } from 'picsur-shared/dist/dto/image-links.class';
import { FileType2Ext } from 'picsur-shared/dist/dto/mimes.dto';
import { EImage } from 'picsur-shared/dist/entities/image.entity';
import {
  AsyncFailable,
  Failable,
  FT,
  Fail,
  HasFailed,
  HasSuccess,
  Open,
} from 'picsur-shared/dist/types/failable';
import { Observable } from 'rxjs';
import { ImageUploadRequest } from '../../models/dto/image-upload-request.dto';
import { ApiService } from './api.service';
import { InfoService } from './info.service';
import { UserService } from './user.service';

export interface UploadResult {
  progress$: Observable<number>;
  result: AsyncFailable<string>;
  cancel: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  constructor(
    private readonly api: ApiService,
    private readonly infoService: InfoService,
    private readonly userService: UserService,
  ) { }

  public async UploadImage(image: File): AsyncFailable<string> {
    const result = await this.api.postForm(
      ImageUploadResponse,
      '/api/image/upload',
      new ImageUploadRequest(image),
    ).result;

    return Open(result, 'id');
  }

  /**
   * 带进度的图片上传
   */
  public UploadImageWithProgress(image: File): UploadResult {
    const request = this.api.postForm(
      ImageUploadResponse,
      '/api/image/upload',
      new ImageUploadRequest(image),
    );

    return {
      progress$: request.uploadProgress,
      result: request.result.then((res) => Open(res, 'id')),
      cancel: request.cancel,
    };
  }

  /**
   * 批量上传图片（带进度）
   */
  public async UploadImagesWithProgress(
    images: File[],
    onProgress: (index: number, progress: number) => void,
    onComplete: (index: number, result: Failable<string>) => void,
  ): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const upload = this.UploadImageWithProgress(images[i]);

      // 订阅进度
      upload.progress$.subscribe((progress: number) => {
        onProgress(i, progress);
      });

      // 等待结果
      const result = await upload.result;
      onComplete(i, result);

      if (HasSuccess(result)) {
        results.push(result);
      }
    }

    return results;
  }

  public async GetImageMeta(image: string): AsyncFailable<ImageMetaResponse> {
    return await this.api.get(ImageMetaResponse, `/i/meta/${image}`).result;
  }

  public async ListAllImages(
    count: number,
    page: number,
    userID?: string,
  ): AsyncFailable<ImageListResponse> {
    return await this.api.post(
      ImageListRequest,
      ImageListResponse,
      '/api/image/list',
      {
        count,
        page,
        user_id: userID,
      },
    ).result;
  }

  public async ListMyImages(
    count: number,
    page: number,
  ): AsyncFailable<ImageListResponse> {
    const userID = await this.userService.snapshot?.id;
    if (userID === undefined) {
      return Fail(FT.Authentication, 'User not logged in');
    }

    return await this.ListAllImages(count, page, userID);
  }

  public async UpdateImage(
    id: string,
    settings: Partial<Pick<EImage, 'file_name' | 'expires_at'>>,
  ): AsyncFailable<EImage> {
    return await this.api.post(
      ImageUpdateRequest,
      ImageUpdateResponse,
      '/api/image/update',
      {
        id,
        ...settings,
      },
    ).result;
  }

  public async DeleteImages(
    images: string[],
  ): AsyncFailable<ImageDeleteResponse> {
    return await this.api.post(
      ImageDeleteRequest,
      ImageDeleteResponse,
      '/api/image/delete',
      {
        ids: images,
      },
    ).result;
  }

  public async DeleteImage(image: string): AsyncFailable<EImage> {
    const result = await this.DeleteImages([image]);
    if (HasFailed(result)) return result;

    if (result.images.length !== 1) {
      return Fail(
        FT.Unknown,
        `Image ${image} was not deleted, probably lacking permissions`,
      );
    }

    return result.images[0];
  }

  // Non api calls

  // Use for native images
  public GetImageURL(
    image: string,
    filetype: string | null,
    allowOverride = false,
    date?: Date | string,
  ): string {
    const baseURL = this.infoService.getHostname(allowOverride);
    const extension = FileType2Ext(filetype ?? '');

    let path = image;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        path = `${dateStr}/${image}`;
      }
    }

    return `${baseURL}/i/${path}${HasSuccess(extension) ? '.' + extension : ''
      }`;
  }

  // Use for user facing urls
  public CreateImageLinks(imageURL: string, name?: string): ImageLinks {
    return {
      source: imageURL,
      markdown: `![image](${imageURL})`,
      html: `<img src="${imageURL}" alt="${name ?? 'image'}">`,
      rst: `.. image:: ${imageURL}`,
      bbcode: `[img]${imageURL}[/img]`,
    };
  }

  public GetImageURLCustomized(
    image: string,
    filetype: string | null,
    options: ImageRequestParams,
    date?: Date | string,
  ): string {
    const baseURL = this.GetImageURL(image, filetype, true, date);
    const betterOptions = ImageRequestParams.zodSchema.safeParse(options);

    if (!betterOptions.success) return baseURL;

    const queryParams: string[] = [];

    if (options.height !== undefined)
      queryParams.push(`height=${options.height}`);
    if (options.width !== undefined) queryParams.push(`width=${options.width}`);
    if (options.rotate !== undefined)
      queryParams.push(`rotate=${options.rotate}`);
    if (options.flipx !== undefined) queryParams.push(`flipx=${options.flipx}`);
    if (options.flipy !== undefined) queryParams.push(`flipy=${options.flipy}`);
    if (options.shrinkonly !== undefined)
      queryParams.push(`shrinkonly=${options.shrinkonly}`);
    if (options.greyscale !== undefined)
      queryParams.push(`greyscale=${options.greyscale}`);
    if (options.noalpha !== undefined)
      queryParams.push(`noalpha=${options.noalpha}`);
    if (options.negative !== undefined)
      queryParams.push(`negative=${options.negative}`);
    if (options.quality !== undefined)
      queryParams.push(`quality=${options.quality}`);

    if (queryParams.length === 0) return baseURL;

    return baseURL + '?' + queryParams.join('&');
  }

  public CreateImageLinksFromID(
    imageID: string,
    mime: string | null,
    name?: string,
    date?: Date | string,
  ): ImageLinks {
    return this.CreateImageLinks(this.GetImageURL(imageID, mime, true, date), name);
  }

  private chunks<T>(arr: T[], size: number): T[][] {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, size + i));
    }

    return result;
  }
}
