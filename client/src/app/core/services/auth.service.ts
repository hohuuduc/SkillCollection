import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { LoadingService } from './loading.service';

export interface GitHubUser {
    login: string;
    avatarUrl: string;
    name?: string;
    id: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private router = inject(Router);
    private http = inject(HttpClient);
    private loadingService = inject(LoadingService);

    // Signals
    readonly token = signal<string>(localStorage.getItem('github_token') || '');
    readonly user = signal<GitHubUser | null>(null);

    // Computed
    readonly isAuthenticated = computed(() => !!this.token());

    constructor() {
        // Effect to persist token to localStorage
        effect(() => {
            const t = this.token();
            if (t) {
                localStorage.setItem('github_token', t);
            } else {
                localStorage.removeItem('github_token');
            }
        });

        // Load user if token exists, otherwise mark auth as complete
        if (this.token()) {
            this.loadCurrentUser();
        } else {
            // No token, auth check complete
            this.loadingService.setAuthLoaded();
        }
    }

    // GitHub OAuth - redirect to authorize
    loginWithGitHub() {
        const clientId = environment.github.clientId;
        const redirectUri = `${window.location.origin}/callback`;
        const scope = 'read:user repo';

        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    }

    // Exchange code for token (called from CallbackComponent)
    async exchangeCodeForToken(code: string): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.http.post<any>('/api/oauth/callback', { code })
            );

            // GitHub returns snake_case: access_token
            const accessToken = response.access_token || response.accessToken;

            if (accessToken) {
                this.token.set(accessToken);
                await this.loadCurrentUser();
                return true;
            }

            console.error('No access token in response:', response);
            this.loadingService.setAuthLoaded();
            return false;
        } catch (error) {
            console.error('Token exchange failed:', error);
            this.loadingService.setAuthLoaded();
            return false;
        }
    }

    // Load current user from GitHub API
    async loadCurrentUser(): Promise<void> {
        try {
            const user = await firstValueFrom(
                this.http.get<GitHubUser>('/api/oauth/user', {
                    headers: { 'Authorization': `Bearer ${this.token()}` }
                })
            );
            this.user.set(user);
        } catch (error) {
            console.error('Load user failed:', error);
            this.user.set(null);
        } finally {
            // Mark auth as complete regardless of success/failure
            this.loadingService.setAuthLoaded();
        }
    }

    logout() {
        this.token.set('');
        this.user.set(null);
        this.router.navigate(['/']);
    }
}

