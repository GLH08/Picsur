import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { Subscription, filter, take, timeout } from 'rxjs';
import { UserService } from '../../services/api/user.service';

@Component({
  selector: 'app-home',
  template: `<div class="home-loading">加载中...</div>`,
  styles: [`
    .home-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      color: var(--text-secondary);
    }
  `],
})
export class HomeComponent implements OnInit, OnDestroy {
  private subscription: Subscription | null = null;

  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    // BehaviorSubject emits current value immediately on subscribe.
    // If user is logged in, current value is null initially (before init completes),
    // then becomes the user after fetch. We filter out null to wait for actual state.
    // If user is NOT logged in, current value is null and never changes,
    // so we timeout after 5 seconds and assume not logged in.
    this.subscription = this.userService.live.pipe(
      filter((user) => user !== null), // Wait for non-null user
      take(1),
    ).subscribe({
      next: (user) => {
        // User is logged in
        this.router.navigate(['/images']);
      },
      error: () => {
        // Timeout (user never became non-null) - not logged in
        this.router.navigate(['/user/login']);
      },
    });

    // Fallback: if no user logged in, BehaviorSubject stays null forever.
    // Set a timeout to navigate to login after 5 seconds.
    setTimeout(() => {
      if (this.subscription && !this.subscription.closed) {
        this.subscription.unsubscribe();
        this.router.navigate(['/user/login']);
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
