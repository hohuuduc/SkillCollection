import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private readonly document = inject(DOCUMENT);
    private readonly platformId = inject(PLATFORM_ID);

    // Track individual loading states
    readonly authLoading = signal(true);
    readonly dataLoading = signal(true);
    readonly resourcesLoading = signal(true);

    // Combined loading state
    readonly isLoading = computed(() =>
        this.authLoading() || this.dataLoading() || this.resourcesLoading()
    );

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            // Check if resources are already loaded
            if (this.document.readyState === 'complete') {
                this.resourcesLoading.set(false);
            } else {
                this.document.defaultView?.addEventListener('load', () => {
                    this.resourcesLoading.set(false);
                    this.checkAndHideLoading();
                });
            }
        }
    }

    setAuthLoaded(): void {
        this.authLoading.set(false);
        this.checkAndHideLoading();
    }

    setDataLoaded(): void {
        this.dataLoading.set(false);
        this.checkAndHideLoading();
    }

    private checkAndHideLoading(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Only hide when all loading states are complete
        if (!this.isLoading()) {
            requestAnimationFrame(() => {
                const loadingElement = this.document.getElementById('app-loading');
                if (loadingElement) {
                    loadingElement.classList.add('hidden');

                    // Remove from DOM after transition completes
                    setTimeout(() => {
                        loadingElement.remove();
                    }, 500); // Match CSS transition duration
                }
            });
        }
    }
}
