import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageMetaResponse } from 'picsur-shared/dist/dto/api/image.dto';
import { ImageLinks } from 'picsur-shared/dist/dto/image-links.class';
import { ImageFileType, SupportedVideoFileTypes } from 'picsur-shared/dist/dto/mimes.dto';
import { EImage } from 'picsur-shared/dist/entities/image.entity';
import { EUser } from 'picsur-shared/dist/entities/user.entity';

import { HasFailed } from 'picsur-shared/dist/types/failable';
import { UUIDRegex } from 'picsur-shared/dist/util/common-regex';
import { ParseFileType } from 'picsur-shared/dist/util/parse-mime';
import { Subscription, timer } from 'rxjs';
import { ImageService } from '../../services/api/image.service';
import { Logger } from '../../services/logger/logger.service';
import { ErrorService } from '../../util/error-manager/error.service';
import { UtilService } from '../../util/util.service';

@Component({
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewComponent implements OnInit, OnDestroy {
  private readonly logger = new Logger(ViewComponent.name);

  private expires_timeout: Subscription | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly imageService: ImageService,
    private readonly errorService: ErrorService,
    private readonly utilService: UtilService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  private id = '';
  public metadata: ImageMetaResponse | null = null;
  public set OnMetadata(metadata: ImageMetaResponse) {
    this.metadata = metadata;
    this.imageLinksCache = {};
    this.subscribeTimeout(metadata.image.expires_at);

    this.changeDetector.markForCheck();
  }

  public formatOptions: {
    value: string;
    key: string;
  }[] = [];

  public selectedFormat: string = ImageFileType.JPEG;

  public get image(): EImage | null {
    return this.metadata?.image ?? null;
  }

  public get user(): EUser | null {
    return this.metadata?.user ?? null;
  }

  public get hasOriginal(): boolean {
    if (this.metadata === null) return false;
    return this.metadata.fileTypes.original !== undefined;
  }

  public get previewLink(): string {
    if (this.metadata === null) return '';

    const width = Math.round(window.innerWidth * window.devicePixelRatio);
    const previewFormat = this.getPreviewFormat();

    return (
      this.imageService.GetImageURL(
        this.id,
        previewFormat,
        false,
        this.image?.created,
      ) + (width > 1 ? `?width=${width}&shrinkonly=yes` : '')
    );
  }

  public get isVideo(): boolean {
    if (this.metadata === null) return false;
    const masterFiletype = this.metadata.fileTypes.master;
    return SupportedVideoFileTypes.includes(masterFiletype);
  }

  public get videoLink(): string {
    if (this.metadata === null) return '';
    return this.imageService.GetImageURL(
      this.id,
      this.getOutputFormat() ?? this.metadata.fileTypes.master,
      false,
      this.image?.created,
    );
  }

  private imageLinksCache: Record<string, ImageLinks> = {};
  public get imageLinks(): ImageLinks {
    if (this.imageLinksCache[this.selectedFormat] !== undefined)
      return this.imageLinksCache[this.selectedFormat];

    const links = this.imageService.CreateImageLinksFromID(
      this.id,
      this.getOutputFormat(),
      this.image?.file_name,
      this.image?.created,
    );

    this.imageLinksCache[this.selectedFormat] = links;
    return links;
  }

  async ngOnInit() {
    {
      const params = this.route.snapshot.paramMap;

      this.id = params.get('id') ?? '';
      if (!UUIDRegex.test(this.id)) {
        return this.errorService.quitError('Invalid image link', this.logger);
      }
    }

    {
      const metadata = await this.imageService.GetImageMeta(this.id);
      if (HasFailed(metadata))
        return this.errorService.quitFailure(metadata, this.logger);

      if (metadata.image.expires_at !== null) {
        if (metadata.image.expires_at <= new Date())
          return this.errorService.quitWarn('Image not found', this.logger);

        this.subscribeTimeout(metadata.image.expires_at);
      }

      this.metadata = metadata;
      this.imageLinksCache = {};
    }

    {
      const masterFiletype = ParseFileType(this.metadata.fileTypes.master);
      if (HasFailed(masterFiletype)) {
        this.selectedFormat = ImageFileType.JPEG;
      } else if (masterFiletype.identifier === ImageFileType.QOI) {
        this.selectedFormat = ImageFileType.JPEG;
      } else {
        this.selectedFormat = masterFiletype.identifier;
      }
    }

    this.updateFormatOptions();
    this.changeDetector.markForCheck();
  }

  ngOnDestroy() {
    if (this.expires_timeout !== null) this.expires_timeout.unsubscribe();
  }

  goBackHome() {
    this.router.navigate(['/']);
  }

  private getOutputFormat(): string | null {
    if (this.selectedFormat === 'original') {
      return null;
    }

    return this.selectedFormat;
  }

  private getPreviewFormat(): string {
    if (this.metadata === null) {
      return ImageFileType.JPEG;
    }

    const requestedFormat =
      this.getOutputFormat() ?? this.metadata.fileTypes.master;

    if (requestedFormat === ImageFileType.QOI) {
      return ImageFileType.JPEG;
    }

    return requestedFormat;
  }

  private updateFormatOptions() {
    let newOptions: {
      value: string;
      key: string;
    }[] = [];

    if (this.hasOriginal) {
      newOptions.push({
        value: 'Original',
        key: 'original',
      });
    }

    if (!this.isVideo) {
      newOptions = newOptions.concat(this.utilService.getBaseFormatOptions());
    }

    this.formatOptions = newOptions;
  }

  private subscribeTimeout(expires_at: Date | null) {
    if (this.expires_timeout !== null) this.expires_timeout.unsubscribe();

    if (expires_at === null) return;

    this.expires_timeout = timer(expires_at).subscribe(() => {
      this.errorService.quitWarn('Image expired', this.logger);
    });
  }
}
