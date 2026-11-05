import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { authGuard, contactGuard } from './core/guards/auth.guard';

// Only the landing page is eager. Every other page loads its own chunk, so the
// initial bundle carries the shell and home and nothing else.
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, data: { breadcrumb: 'Home' } },
  {
    path: 'projects',
    data: { breadcrumb: 'Projects' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/projects/projects.component').then((m) => m.ProjectsComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/project-detail/project-detail.component').then(
            (m) => m.ProjectDetailComponent,
          ),
        data: { breadcrumb: 'Project Details' },
      },
    ],
  },
  {
    path: 'articles',
    data: { breadcrumb: 'Articles' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/articles/articles.component').then((m) => m.ArticlesComponent),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./features/article-detail/article-detail.component').then(
            (m) => m.ArticleDetailComponent,
          ),
        data: { breadcrumb: 'Article' },
      },
    ],
  },
  {
    path: 'tools',
    data: { breadcrumb: 'Tools' },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/tools/tools.component').then((m) => m.ToolsComponent),
      },
      {
        path: 'ai-cost-calculator',
        loadComponent: () =>
          import('./features/tools/ai-cost-calculator/ai-cost-calculator.component').then(
            (m) => m.AiCostCalculatorComponent,
          ),
        data: { breadcrumb: 'AI Cost Calculator' },
      },
    ],
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent),
    data: { breadcrumb: 'About' },
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/privacy/privacy.component').then((m) => m.PrivacyComponent),
    data: { breadcrumb: 'Privacy Policy' },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    data: { breadcrumb: 'My Profile' },
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    data: { breadcrumb: 'Login' },
  },
  {
    path: 'oauth2/redirect',
    loadComponent: () =>
      import('./features/auth/oauth2-redirect/oauth2-redirect.component').then(
        (m) => m.Oauth2RedirectComponent,
      ),
    data: { breadcrumb: 'Authenticating' },
  },
  {
    path: 'login/device',
    loadComponent: () =>
      import('./features/auth/github-device/github-device.component').then(
        (m) => m.GithubDeviceComponent,
      ),
    data: { breadcrumb: 'GitHub Device Login' },
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
    data: { breadcrumb: 'Admin' },
    canActivate: [authGuard],
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then((m) => m.ContactComponent),
    data: { breadcrumb: 'Contact' },
    canDeactivate: [contactGuard],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
