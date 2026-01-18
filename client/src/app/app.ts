import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar class="app-sidebar"></app-sidebar>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
    }
    
    .app-sidebar {
      flex-shrink: 0;
    }
    
    .main-content {
      flex-grow: 1;
      overflow-y: auto;
      height: 100vh;
    }
  `]
})
export class AppComponent {
  // Inject LoadingService to ensure it's initialized early
  private readonly loadingService = inject(LoadingService);
}
