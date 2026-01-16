import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { GithubService } from '../../../core/services/github.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar-container">
      <div class="brand">
        <h2>Intro Manager</h2>
      </div>

      <!-- Auth Section -->
      <div class="section">
        @if (auth.isAuthenticated()) {
          <div class="user-info">
            <img [src]="auth.user()?.avatarUrl" [alt]="auth.user()?.login" class="avatar">
            <div class="user-details">
              <span class="username">{{ auth.user()?.login }}</span>
              <button class="btn-logout" (click)="auth.logout()">Logout</button>
            </div>
          </div>
        } @else {
          <button class="btn btn-primary btn-full" (click)="auth.loginWithGitHub()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Login with GitHub
          </button>
        }
      </div>

      <!-- Repository Info -->
      <div class="section" *ngIf="auth.isAuthenticated()">
        <h3>Repository</h3>
        <div class="repo-info">
          <span class="repo-name">{{ repoOwner }}/{{ repoName }}</span>
        </div>
      </div>

      <!-- Labels Section -->
      <div class="section" *ngIf="auth.isAuthenticated()">
        <h3>Labels</h3>
        <div class="labels-list">
          @for (label of labels(); track label.id) {
            <button class="label-btn" [style.border-color]="'#' + label.color">
              <span class="color-dot" [style.background-color]="'#' + label.color"></span>
              {{ label.name }}
            </button>
          }
          
          @if (labels().length === 0) {
            <div class="empty-text">No labels found</div>
          }
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar-container {
      width: 280px;
      height: 100vh;
      background-color: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
    }
    
    .brand h2 {
      margin: 0 0 2rem 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .section {
      margin-bottom: 2rem;
    }
    
    .section h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .username {
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .btn-logout {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      padding: 0;
      text-align: left;
    }
    
    .btn-logout:hover {
      color: var(--danger);
      text-decoration: underline;
    }
    
    .btn-full {
      width: 100%;
      gap: 0.5rem;
    }
    
    .repo-info {
      background: var(--bg-primary);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
    }
    
    .repo-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .labels-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .label-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      text-align: left;
      font-size: 0.875rem;
    }
    
    .label-btn:hover {
      background-color: var(--bg-hover);
    }
    
    .color-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }
    
    .empty-text {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-style: italic;
    }
  `]
})
export class SidebarComponent {
  auth = inject(AuthService);
  github = inject(GithubService);

  repoOwner = environment.github.owner;
  repoName = environment.github.repo;

  // Labels signal
  labels = toSignal(this.github.getRepoLabels().pipe(catchError(() => of([]))), { initialValue: [] });
}
