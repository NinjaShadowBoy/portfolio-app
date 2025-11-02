import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProjectsComponent } from './projects/projects.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { ProjectDetailComponent } from './project-detail/project-detail.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { authGuard, contactGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './admin/admin.component';
import { Oauth2RedirectComponent } from './oauth2-redirect/oauth2-redirect.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
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
