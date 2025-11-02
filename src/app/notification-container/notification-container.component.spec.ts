import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationContainerComponent } from './notification-container.component';
import { NotificationService } from '../services/notification.service';

describe('NotificationContainerComponent', () => {
  let component: NotificationContainerComponent;
  let fixture: ComponentFixture<NotificationContainerComponent>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationContainerComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display notifications from the service', () => {
    notificationService.success('Test success message');
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const notification = compiled.querySelector('.notification-success');

    expect(notification).toBeTruthy();
    expect(notification.textContent).toContain('Test success message');
  });

  it('should dismiss notification when close button is clicked', () => {
    const id = notificationService.success('Test message');
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    let notifications = compiled.querySelectorAll('.notification');
    expect(notifications.length).toBe(1);

    const closeButton = compiled.querySelector('.notification-close');
    closeButton.click();
    fixture.detectChanges();

    notifications = compiled.querySelectorAll('.notification');
    expect(notifications.length).toBe(0);
  });

  it('should display correct icon for each notification type', () => {
    expect(component.getIcon('success')).toBe('✓');
    expect(component.getIcon('error')).toBe('✕');
    expect(component.getIcon('warning')).toBe('⚠');
    expect(component.getIcon('info')).toBe('ℹ');
  });
});
