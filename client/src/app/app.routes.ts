import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { CallbackComponent } from './features/callback/callback';

export const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'callback', component: CallbackComponent },
    { path: '**', redirectTo: '' }
];
