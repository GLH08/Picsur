import { Injectable } from '@angular/core';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { UserMePermissionsResponse } from 'picsur-shared/dist/dto/api/user.dto';
import { AsyncFailable, HasFailed } from 'picsur-shared/dist/types/failable';
import { BehaviorSubject, Observable, filter, map, take } from 'rxjs';
import { Throttle } from '../../util/throttle';
import { Logger } from '../logger/logger.service';
import { ApiService } from './api.service';
import { StaticInfoService } from './static-info.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  private allPermissions: string[] = [];
  private permissionsSubject = new BehaviorSubject<string[] | null>(null);

  public get live(): Observable<string[]> {
    return this.permissionsSubject.pipe(
      map((permissions) => permissions ?? this.allPermissions),
    );
  }

  public get snapshot(): string[] {
    return this.permissionsSubject.getValue() ?? this.allPermissions;
  }

  // This will not be optimistic, it will instead wait for correct data
  public getLoadedSnapshot(): Promise<string[]> {
    return new Promise((resolve) => {
      // If we already have permissions loaded in subject, resolve immediately
      if (this.permissionsSubject.getValue()?.length) {
        resolve(this.permissionsSubject.getValue()!);
        return;
      }

      // Wait for the permissionsSubject to be updated with user-specific permissions
      const filtered = this.permissionsSubject.pipe(
        filter((permissions) => permissions !== null && permissions.length > 0),
        take(1),
      );
      (filtered as Observable<string[]>).subscribe(resolve);

      // Safety timeout: if permissions don't load within 5 seconds,
      // resolve with empty array (will result in 401 access denied)
      setTimeout(() => resolve([]), 5000);
    });
  }

  constructor(
    private readonly userService: UserService,
    private readonly api: ApiService,
    private readonly staticInfo: StaticInfoService,
  ) {
    this.subscribeUser();
    this.loadAllPermissions().catch((e) => this.logger.error(e));
  }

  private async loadAllPermissions() {
    this.allPermissions = await this.staticInfo.getAllPermissions();
  }

  @AutoUnsubscribe()
  private subscribeUser() {
    return this.userService.live.pipe(Throttle(300)).subscribe(async () => {
      const permissions = await this.updatePermissions();
      if (HasFailed(permissions)) {
        this.logger.error(permissions.getReason());
        return;
      }
    });
  }

  private async updatePermissions(): AsyncFailable<true> {
    const got = await this.api.get(
      UserMePermissionsResponse,
      '/api/user/me/permissions',
    ).result;
    if (HasFailed(got)) return got;

    this.permissionsSubject.next(got.permissions);
    return true;
  }
}
