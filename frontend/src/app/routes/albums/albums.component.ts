import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { EAlbum } from 'picsur-shared/dist/entities/album.entity';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { AlbumService } from '../../services/api/album.service';
import { ErrorService } from '../../util/error-manager/error.service';
import { Logger } from '../../services/logger/logger.service';
import { DialogService } from '../../util/dialog-manager/dialog.service';

@Component({
  selector: 'app-albums',
  templateUrl: './albums.component.html',
  styleUrls: ['./albums.component.scss'],
})
@AutoUnsubscribe()
export class AlbumsComponent implements OnInit {
  private readonly logger: Logger = new Logger(AlbumsComponent.name);

  albums: EAlbum[] = [];
  loading = false;
  createDialogOpen = false;
  editingAlbum: EAlbum | null = null;

  albumForm = {
    name: '',
    description: '',
  };

  constructor(
    private readonly router: Router,
    private readonly errorService: ErrorService,
    private readonly dialogService: DialogService,
    private readonly albumService: AlbumService,
  ) {}

  async ngOnInit() {
    await this.loadAlbums();
  }

  async loadAlbums() {
    this.loading = true;
    try {
      const result = await this.albumService.listAlbums();
      if (HasFailed(result)) {
        this.errorService.showFailure(result, this.logger);
        this.albums = [];
      } else {
        this.albums = result;
      }
    } catch (error) {
      this.logger.error('Failed to load albums:', error);
      this.errorService.error('加载相册失败', this.logger);
      this.albums = [];
    } finally {
      this.loading = false;
    }
  }

  openCreateDialog() {
    this.albumForm = { name: '', description: '' };
    this.editingAlbum = null;
    this.createDialogOpen = true;
  }

  openEditDialog(album: EAlbum, event?: Event) {
    event?.stopPropagation();
    this.albumForm = {
      name: album.name,
      description: album.description || '',
    };
    this.editingAlbum = album;
    this.createDialogOpen = true;
  }

  closeDialog() {
    this.createDialogOpen = false;
    this.editingAlbum = null;
    this.albumForm = { name: '', description: '' };
  }

  async saveAlbum() {
    if (!this.albumForm.name.trim()) {
      this.errorService.error('请输入相册名称', this.logger);
      return;
    }

    try {
      if (this.editingAlbum) {
        // 更新相册
        const result = await this.albumService.updateAlbum(this.editingAlbum.id, {
          name: this.albumForm.name.trim(),
          description: this.albumForm.description.trim() || undefined,
        });

        if (HasFailed(result)) {
          return this.errorService.showFailure(result, this.logger);
        }

        // 更新本地列表
        const index = this.albums.findIndex((a) => a.id === this.editingAlbum!.id);
        if (index !== -1) {
          this.albums[index] = result;
        }
        this.errorService.success('相册更新成功');
      } else {
        // 创建新相册
        const result = await this.albumService.createAlbum(
          this.albumForm.name.trim(),
          this.albumForm.description.trim() || undefined,
        );

        if (HasFailed(result)) {
          return this.errorService.showFailure(result, this.logger);
        }

        // 重新加载列表
        await this.loadAlbums();
        this.errorService.success('相册创建成功');
      }
      this.closeDialog();
    } catch (error) {
      this.logger.error('Failed to save album:', error);
      this.errorService.error('保存相册失败', this.logger);
    }
  }

  async deleteAlbum(album: EAlbum, event?: Event) {
    event?.stopPropagation();

    const pressedButton = await this.dialogService.showDialog({
      title: `确定要删除相册"${album.name}"吗？`,
      description: '此操作无法撤销，相册内的图片不会被删除。',
      buttons: [
        { name: 'cancel', text: '取消' },
        { color: 'warn', name: 'delete', text: '删除' },
      ],
    });

    if (pressedButton === 'delete') {
      try {
        const result = await this.albumService.deleteAlbum(album.id);
        if (HasFailed(result)) {
          return this.errorService.showFailure(result, this.logger);
        }

        this.albums = this.albums.filter((a) => a.id !== album.id);
        this.errorService.success('相册删除成功');
      } catch (error) {
        this.logger.error('Failed to delete album:', error);
        this.errorService.error('删除相册失败', this.logger);
      }
    }
  }

  viewAlbum(album: EAlbum) {
    this.router.navigate(['/albums', album.id]);
  }

  getPhotoCount(album: EAlbum): number {
    return album.image_ids?.length || 0;
  }

  getCoverUrl(album: EAlbum): string | null {
    return album.cover_url || null;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }
}
