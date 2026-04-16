import { Routes } from '@angular/router';

export const PORTFOLIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/terminal/terminal.component').then(
        (m) => m.TerminalComponent
      ),
  },
];
