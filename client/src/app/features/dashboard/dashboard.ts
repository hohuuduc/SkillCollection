import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GithubService } from '../../core/services/github.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Introduction } from '../../core/models/types';
import { IntroductionEditorComponent } from '../introduction-editor/introduction-editor';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IntroductionEditorComponent],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <div class="header-left">
          <div class="search-box">
             <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Search introductions..." class="search-input">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
      </header>
      
      <!-- Login prompt for creating new -->
      @if (!auth.isAuthenticated()) {
        <div class="login-prompt">
          <p>Login with GitHub to create and manage your introductions.</p>
        </div>
      }

      <div class="grid-container">
        @for (intro of filteredIntroductions(); track intro.id) {
          <div class="intro-card card">
            <div class="card-body" (click)="openView(intro)">
              <!-- Author info -->
              <div class="card-author">
                <img [src]="intro.author.avatarUrl" [alt]="intro.author.login" class="author-avatar">
                <span class="author-name">{{ intro.author.login }}</span>
              </div>
              
              <h3 class="card-title">{{ intro.title }}</h3>
              <div class="card-preview">
                 {{ intro.body | slice:0:150 }}...
              </div>
              
              <div class="labels-row">
                @for (label of intro.labels; track label.id) {
                  <span class="label-badge"
                        [style.background-color]="'#' + label.color + '20'"
                        [style.color]="'#' + label.color"
                        [style.border-color]="'#' + label.color">
                    {{ label.name }}
                  </span>
                }
              </div>
              
              <div class="card-footer">
                <span class="date">{{ intro.createdAt | date:'mediumDate' }}</span>
                @if (auth.isAuthenticated() && intro.author.login === auth.user()?.login) {
                  <div class="actions">
                    <button class="btn-icon" (click)="$event.stopPropagation(); openEdit(intro)" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon danger" (click)="$event.stopPropagation(); deleteItem(intro)" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        }
        
        @if (filteredIntroductions().length === 0) {
          <div class="empty-state">
             No introductions found
          </div>
        }
      </div>
    </div>
    
    <!-- Editor Modal -->
    <app-introduction-editor 
      *ngIf="showEditor"
      [introduction]="selectedIntro"
      [readOnly]="viewMode"
      (close)="closeEditor()"
      (saved)="onSaved()">
    </app-introduction-editor>
    
    <!-- Floating Action Button -->
    @if (auth.isAuthenticated()) {
      <button class="fab" (click)="openCreate()" title="New Introduction">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: inherit;
    }

    .dashboard-container {
      padding: 2rem;
      max-width: 1600px;
      margin: 0 auto;
      height: inherit;
    }
    
    .login-prompt {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
      border-radius: var(--radius-lg);
      padding: 1rem 1.5rem;
      margin-bottom: 1.5rem;
      color: #0369a1;
      font-size: 0.875rem;
    }
    
    .login-prompt p {
      margin: 0;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 2rem;
      flex: 1;
    }
    
    .header h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      white-space: nowrap;
    }
    
    .search-box {
      position: relative;
      max-width: 400px;
      width: 100%;
    }
    
    .search-input {
      width: 100%;
      padding: 0.5rem 1rem 0.5rem 2.5rem;
      border: 1px solid var(--border-color);
      border-radius: 99px;
      font-size: 0.875rem;
      background: var(--bg-primary);
      transition: all 0.2s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--focus-ring);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }
    
    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      width: 16px;
      height: 16px;
    }
    
    .mr-2 { margin-right: 0.5rem; }
    
    .grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    
    .card-author {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color);
    }
    
    .author-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .author-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
    }
    
    .card-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      height: 100%;
      user-select: none;
    }
    
    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
      color: var(--text-primary);
    }
    
    .card-preview {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
      flex-grow: 1;
      line-height: 1.6;
    }
    
    .labels-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .label-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 99px;
      border: 1px solid;
      font-weight: 500;
    }
    
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }
    
    .date {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .btn-icon {
      background: transparent;
      border: none;
      padding: 0.25rem;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      transition: background 0.2s;
    }
    
    .btn-icon:hover {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }
    
    .btn-icon.danger:hover {
      background-color: #fee2e2;
      color: var(--danger);
    }
    
    .empty-state {
      text-align: center;
      padding: 4rem;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--border-color);
      color: var(--text-secondary);
      grid-column: 1 / -1;
    }
    
    .fab {
      position: fixed;
      bottom: 2rem;
      left: calc(280px + 2rem);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 100;
    }
    
    .fab:hover {
      background: var(--primary-hover);
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
    }
    
    .fab:active {
      transform: scale(0.95);
    }
  `]
})
export class DashboardComponent {
  auth = inject(AuthService);
  github = inject(GithubService);
  private ui = inject(UiService);

  introductions = toSignal(this.github.getDiscussions().pipe(catchError(() => of([]))), { initialValue: [] });
  searchQuery = signal('');

  constructor() {
    // Listen for create trigger from sidebar
    effect(() => {
      if (this.ui.openCreateEditor()) {
        this.openCreate();
        this.ui.resetCreate();
      }
    });
  }

  filteredIntroductions = computed(() => {
    let list = this.introductions() as Introduction[] || []; // Cast to ensure array
    const query = this.searchQuery().toLowerCase().trim();
    const currentUser = this.auth.user();

    // Filter by 'My Collection' if enabled
    if (this.ui.filterByMyself() && currentUser) {
      list = list.filter(item => item.author?.login === currentUser.login);
    }

    // Filter by Label if selected
    const selectedLabel = this.ui.selectedLabelId();
    if (selectedLabel) {
      list = list.filter(item => item.labels.some(l => l.id === selectedLabel));
    }

    if (!query) return list;

    return list.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.body.toLowerCase().includes(query)
    );
  });

  showEditor = false;
  viewMode = false;
  selectedIntro: Introduction | null = null;

  openCreate() {
    this.selectedIntro = null;
    this.viewMode = false;
    this.showEditor = true;
  }

  openEdit(intro: Introduction) {
    this.selectedIntro = intro;
    this.viewMode = false;
    this.showEditor = true;
  }

  openView(intro: Introduction) {
    this.selectedIntro = intro;
    this.viewMode = true;
    this.showEditor = true;
  }

  closeEditor() {
    this.showEditor = false;
    this.selectedIntro = null;
  }

  onSaved() {
    this.closeEditor();
    // Refresh data logic needed here, ideally via signal refresh or BehaviorSubject in service
    // For MVP, user might need to refresh page or we implement a refresh trigger in service
    window.location.reload(); // Quick MVP fix
  }

  deleteItem(intro: Introduction) {
    if (confirm('Are you sure you want to delete this introduction?')) {
      this.github.deleteIntroduction(intro.id).subscribe({
        next: () => {
          window.location.reload();
        },
        error: (err) => alert('Failed to delete: ' + err.message)
      });
    }
  }
}
