import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
} from '@angular/core';

enum PicsurImgState {
  Init = 'init',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error',
}

@Component({
  selector: 'picsur-img',
  templateUrl: './picsur-img.component.html',
  styleUrls: ['./picsur-img.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicsurImgComponent implements OnChanges {
  @Input('src') imageURL: string | undefined;

  public state: PicsurImgState = PicsurImgState.Init;
  public displayUrl: string = '';
  private isInView = false;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnChanges(): void {
    if (!this.imageURL) {
      this.displayUrl = '';
      this.state = PicsurImgState.Init;
      this.changeDetector.markForCheck();
      return;
    }

    this.loadImage();
  }

  private loadImage() {
    if (!this.imageURL) return;

    let url = this.imageURL;
    if (url.includes('.qoi')) {
      url = url.replace('.qoi', '.jpeg');
    }

    this.displayUrl = url;
    this.state = PicsurImgState.Loading;
    this.changeDetector.markForCheck();
  }

  onImageLoad() {
    this.state = PicsurImgState.Loaded;
    this.changeDetector.markForCheck();
  }

  onImageError() {
    this.state = PicsurImgState.Error;
    this.changeDetector.markForCheck();
  }

  onInview() {
    this.isInView = true;
    if (this.state === PicsurImgState.Init && this.imageURL) {
      this.loadImage();
    }
  }

  onOutview() {
    this.isInView = false;
  }
}