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

    // Filter by my collection
    readonly filterByMyself = signal(false);

    toggleMyCollection() {
        this.filterByMyself.update(v => !v);
    }

    setFilterByMyself(value: boolean) {
        this.filterByMyself.set(value);
    }

    // Filter by Label
    readonly selectedLabelId = signal<string | null>(null);

    toggleLabel(labelId: string) {
        this.selectedLabelId.update(current => current === labelId ? null : labelId);
    }
}
