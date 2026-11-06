import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { authGuard, contactGuard } from './core/guards/auth.guard';

// Only the landing page is eager. Every other page loads its own chunk, so the
// initial bundle carries the shell and home and nothing else.
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, data: { breadcrumb: $localize`:Breadcrumb label@@crumbHome:Home` } },
  {
    path: 'projects',
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbProjects:Projects` },
    children: [
      {
        path: '',
        title: $localize`:Projects page title@@titleProjects:Projects`,
        loadComponent: () =>
          import('./features/projects/projects.component').then((m) => m.ProjectsComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/project-detail/project-detail.component').then(
            (m) => m.ProjectDetailComponent,
          ),
        // The page replaces this with the project's name once it has loaded.
        title: $localize`:Project detail fallback title@@titleProject:Project`,
        data: { breadcrumb: $localize`:Breadcrumb label@@crumbProject:Project` },
      },
    ],
  },
  // Old paths from before the page was renamed.
  { path: 'articles', redirectTo: 'publications', pathMatch: 'full' },
  { path: 'articles/:slug', redirectTo: 'publications/:slug' },
  {
    path: 'publications',
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbPublications:Publications` },
    children: [
      {
        path: '',
        title: $localize`:Publications page title@@titlePublications:Publications`,
        loadComponent: () =>
          import('./features/articles/articles.component').then((m) => m.ArticlesComponent),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./features/article-detail/article-detail.component').then(
            (m) => m.ArticleDetailComponent,
          ),
        data: { breadcrumb: $localize`:Breadcrumb label@@crumbArticle:Article` },
      },
    ],
  },
  {
    path: 'tools',
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbTools:Tools` },
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
        data: { breadcrumb: $localize`:Breadcrumb label@@crumbAiCostCalculator:AI Cost Calculator` },
      },
    ],
  },
  {
    path: 'about',
    title: $localize`:About page title@@titleAbout:About`,
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent),
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbAbout:About` },
  },
  {
    path: 'privacy',
    title: $localize`:Privacy page title@@titlePrivacy:Privacy Policy`,
    loadComponent: () =>
      import('./features/privacy/privacy.component').then((m) => m.PrivacyComponent),
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbPrivacyPolicy:Privacy Policy` },
  },
  {
    path: 'profile',
    title: $localize`:Profile page title@@titleProfile:My Profile`,
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbMyProfile:My Profile` },
    canActivate: [authGuard],
  },
  {
    path: 'login',
    title: $localize`:Login page title@@titleLogin:Log in`,
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbLogin:Login` },
  },
  {
    path: 'oauth2/redirect',
    loadComponent: () =>
      import('./features/auth/oauth2-redirect/oauth2-redirect.component').then(
        (m) => m.Oauth2RedirectComponent,
      ),
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbAuthenticating:Authenticating` },
  },
  {
    path: 'login/device',
    loadComponent: () =>
      import('./features/auth/github-device/github-device.component').then(
        (m) => m.GithubDeviceComponent,
      ),
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbGithubDeviceLogin:GitHub Device Login` },
  },
  {
    path: 'admin',
    title: 'Admin',
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
    data: { breadcrumb: 'Admin' },
    canActivate: [authGuard],
  },
  {
    path: 'contact',
    title: $localize`:Contact page title@@titleContact:Contact`,
    loadComponent: () =>
      import('./features/contact/contact.component').then((m) => m.ContactComponent),
    data: { breadcrumb: $localize`:Breadcrumb label@@crumbContact:Contact` },
    canDeactivate: [contactGuard],
  },
  {
    path: '**',
    title: $localize`:Not found page title@@titleNotFound:Page not found`,
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
