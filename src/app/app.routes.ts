import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ProjectsComponent } from './features/projects/projects.component';
import { AboutComponent } from './features/about/about.component';
import { ContactComponent } from './features/contact/contact.component';
import { ProjectDetailComponent } from './features/project-detail/project-detail.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { authGuard, contactGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { AdminComponent } from './features/admin/admin.component';
import { Oauth2RedirectComponent } from './features/auth/oauth2-redirect/oauth2-redirect.component';
import { GithubDeviceComponent } from './features/auth/github-device/github-device.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, data: { breadcrumb: 'Home' } },
  {
    path: 'projects',
    data: { breadcrumb: 'Projects' },
    children: [
      {
        path: '',
        component: ProjectsComponent,
      },
      {
        path: ':id',
        component: ProjectDetailComponent,
        data: { breadcrumb: 'Project Details' },
      },
    ],
  },
  { path: 'about', component: AboutComponent, data: { breadcrumb: 'About' } },
  { path: 'login', component: LoginComponent, data: { breadcrumb: 'Login' } },
  {
    path: 'oauth2/redirect',
    component: Oauth2RedirectComponent,
    data: { breadcrumb: 'Authenticating' },
  },
  {
    path: 'login/device',
    component: GithubDeviceComponent,
    data: { breadcrumb: 'GitHub Device Login' },
  },
  {
    path: 'admin',
    component: AdminComponent,
    data: { breadcrumb: 'Admin' },
    canActivate: [authGuard],
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: { breadcrumb: 'Contact' },
    canDeactivate: [contactGuard],
  },
  { path: '**', component: NotFoundComponent },
];
