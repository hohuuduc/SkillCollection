import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { GithubService } from '../../core/services/github.service';
import { Introduction, Label } from '../../core/models/types';
import { toSignal } from '@angular/core/rxjs-interop';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import hljs from 'highlight.js';

@Component({
  selector: 'app-introduction-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2>{{ getTitle() }}</h2>
          <button class="close-btn" (click)="close.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-body">
            <div class="form-group">
              @if (readOnly) {
                <div class="input-lg read-only-title">{{ form.get('title')?.value }}</div>
              } @else {
                <input type="text" formControlName="title" placeholder="Introduction Title" class="input-lg">
              }
            </div>

            <div class="editor-container">
              @if (!readOnly) {
                <div class="editor-pane" [class.invalid-pane]="form.get('body')?.invalid && form.get('body')?.touched">
                  <div class="pane-header">Markdown</div>
                  <textarea formControlName="body" placeholder="Write your introduction in Markdown..." (input)="updatePreview()"></textarea>
                </div>
              }
              <div class="preview-pane">
                <div class="pane-header">
                  <span>Preview</span>
                  <button type="button" class="btn-copy" (click)="copyRaw()" title="Copy Raw Markdown">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
                <div class="markdown-content" [innerHTML]="previewHtml"></div>
              </div>
            </div>
          </div>

          @if (!readOnly) {
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" (click)="close.emit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading">
                {{ loading ? 'Saving...' : 'Save' }}
              </button>
            </div>
          }
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    }
    
    .modal-content {
      background: var(--bg-primary);
      width: 90%;
      max-width: 1000px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
    }
    
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
    }
    
    .form-body {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 75vh;
    }
    
    .input-lg {
      width: 100%;
      padding: 0.75rem;
      font-size: 1.25rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    
    .labels-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .labels-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    
    .label-chip {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid;
      border-radius: 99px;
      background: transparent;
      font-size: 0.875rem;
      opacity: 0.6;
      transition: all 0.2s;
    }
    
    .label-chip.selected {
      opacity: 1;
      box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--focus-ring);
    }
    
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }
    
    .editor-container {
      display: flex;
      gap: 1rem;
      flex: 1;
      min-height: 400px;
    }
    
    .editor-pane, .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    
    .pane-header {
      padding: 0.5rem 1rem;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-copy {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.125rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }

    .btn-copy:hover {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }
    
    textarea {
      flex: 1;
      width: 100%;
      padding: 1rem;
      border: none;
      resize: none;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    
    textarea:focus {
      outline: none;
    }
    
    .markdown-content {
      padding: 1rem;
      overflow-y: auto;
      height: 100%;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }

    .input-lg.ng-invalid.ng-touched {
      border-color: #ef4444;
    }

    .editor-pane.invalid-pane {
      border-color: #ef4444;
    }

    .read-only-title {
      border: none;
      padding-left: 0;
      font-weight: 700;
      font-size: 1.5rem;
    }
  `]
})
export class IntroductionEditorComponent {
  @Input() set introduction(value: Introduction | null) {
    this._intro = value;
    if (value) {
      this.form.patchValue({
        title: value.title,
        body: value.body
      });
      this.selectedLabelIds = value.labels.map(l => l.id);
      this.updatePreview();
    } else {
      this.form.reset();
      this.selectedLabelIds = [];
      this.previewHtml = '';
    }
  }

  @Input() readOnly = false;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private _intro: Introduction | null = null;

  isEdit = computed(() => !!this._intro);

  github = inject(GithubService);
  fb = inject(FormBuilder);
  sanitizer = inject(DomSanitizer);

  repoLabels = toSignal(this.github.getRepoLabels(), { initialValue: [] });

  form = this.fb.group({
    title: ['', Validators.required],
    body: ['', Validators.required]
  });

  selectedLabelIds: string[] = [];
  previewHtml: SafeHtml = '';
  loading = false;

  updatePreview() {
    const rawMarkdown = this.form.get('body')?.value || '';
    const html = marked.parse(rawMarkdown, {
      async: false,
      gfm: true,
      breaks: true
    }) as string;

    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  isLabelSelected(id: string): boolean {
    return this.selectedLabelIds.includes(id);
  }

  toggleLabel(id: string) {
    if (this.selectedLabelIds.includes(id)) {
      this.selectedLabelIds = this.selectedLabelIds.filter(l => l !== id);
    } else {
      this.selectedLabelIds.push(id);
    }
  }

  save() {
    if (this.readOnly || this.form.invalid) {
      if (!this.readOnly) this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { title, body } = this.form.value;

    const obs$ = this.isEdit()
      ? this.github.updateIntroduction(this._intro!.id, title!, body!, this.selectedLabelIds)
      : this.github.createIntroduction(title!, body!, this.selectedLabelIds);

    obs$.subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
      },
      error: (err) => {
        this.loading = false;
        alert('Error saving: ' + err.message);
      }
    });
  }

  getTitle(): string {
    if (this.readOnly) return 'Introduction Details';
    return this.isEdit() ? 'Edit Introduction' : 'New Introduction';
  }

  copyRaw() {
    const rawMarkdown = this.form.get('body')?.value || '';
    navigator.clipboard.writeText(rawMarkdown).then(() => {
      // Optional: Could add a toast or temporary checkmark change
      // For now, simpler is better
    });
  }
}
