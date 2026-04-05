import { Component } from '@angular/core';

@Component({
  template: `
    <div class="state-page media-page-shell">
      <div class="state-card">
        <span class="state-card__eyebrow">404</span>
        <h1>页面不存在</h1>
        <p>你访问的地址不存在，可能已经移动或被删除。</p>
        <a routerLink="/">返回首页</a>
      </div>
    </div>
  `,
  styles: [
    `
      .state-page { display:grid; place-items:center; min-height:calc(100vh - var(--header-height) - 120px); }
      .state-card { width:min(100%,560px); padding:28px; text-align:center; border-radius:var(--radius-2xl); background:linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.68)); border:1px solid var(--border-soft); box-shadow:var(--shadow-float); }
      .state-card__eyebrow { display:inline-flex; margin-bottom:12px; padding:6px 12px; border-radius:var(--radius-pill); background:rgba(255,255,255,0.62); border:1px solid rgba(255,255,255,0.74); color:var(--accent-primary-strong); font-size:.76rem; font-weight:800; letter-spacing:.12em; }
      .state-card h1 { margin:0 0 10px; }
      .state-card p { margin:0 0 18px; color:var(--text-secondary); }
      .state-card a { color:var(--accent-primary-strong); text-decoration:none; font-weight:700; }
      .state-card a:hover { text-decoration:underline; }
    `,
  ],
})
export class E404Component {}
