import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/landing/landing.routes').then((m) => m.LANDING_ROUTES),
  },
  // future features — uncomment as you build them
  // { path: 'admin',     loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  // { path: 'themes',   loadChildren: () => import('./features/theme-builder/theme-builder.routes').then(m => m.THEME_BUILDER_ROUTES) },
  // { path: ':username', loadChildren: () => import('./features/portfolio/portfolio.routes').then(m => m.PORTFOLIO_ROUTES) },
  { path: '**', redirectTo: '' },
];
