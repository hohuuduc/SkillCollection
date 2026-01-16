import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-callback',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="callback-container">
      <div class="loading-spinner"></div>
      <p>{{ message }}</p>
    </div>
  `,
    styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 1rem;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    p {
      color: var(--text-secondary);
    }
  `]
})
export class CallbackComponent implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private auth = inject(AuthService);

    message = 'Authenticating with GitHub...';

    async ngOnInit() {
        const code = this.route.snapshot.queryParamMap.get('code');
        const error = this.route.snapshot.queryParamMap.get('error');

        if (error) {
            this.message = 'Authentication failed. Redirecting...';
            setTimeout(() => this.router.navigate(['/']), 2000);
            return;
        }

        if (code) {
            const success = await this.auth.exchangeCodeForToken(code);

            if (success) {
                this.message = 'Success! Redirecting...';
                this.router.navigate(['/']);
            } else {
                this.message = 'Failed to authenticate. Redirecting...';
                setTimeout(() => this.router.navigate(['/']), 2000);
            }
        } else {
            this.message = 'No authorization code. Redirecting...';
            setTimeout(() => this.router.navigate(['/']), 2000);
        }
    }
}
