import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UiService {
    // Signal to trigger opening the create editor
    readonly openCreateEditor = signal(false);

    triggerCreate() {
        this.openCreateEditor.set(true);
    }

    resetCreate() {
        this.openCreateEditor.set(false);
    }
}
