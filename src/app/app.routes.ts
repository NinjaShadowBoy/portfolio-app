import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProjectsComponent } from './projects/projects.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { ProjectDetailComponent } from './project-detail/project-detail.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { authGuard, contactGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, data: { breadcrumb: 'Home' } },
  {
    path: 'projects',
    // component: ProjectsComponent,
    data: { breadcrumb: 'Projects' },
    children: [
      {
        path: '',
        component: ProjectsComponent,
        // data: { breadcrumb: 'Project Details' },
      },
      {
        path: ':id',
        component: ProjectDetailComponent,
        data: { breadcrumb: 'Project Details' },
      },
    ],
  },
  { path: 'about', component: AboutComponent, data: { breadcrumb: 'About' } },
  {
    path: 'contact',
    component: ContactComponent,
    data: { breadcrumb: 'Contact' },
    canActivate: [authGuard], // Protect contact page
    canDeactivate: [contactGuard],
  },
  { path: '**', component: NotFoundComponent },
];
