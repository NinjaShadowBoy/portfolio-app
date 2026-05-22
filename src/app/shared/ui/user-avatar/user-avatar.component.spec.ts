import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAvatarComponent } from './user-avatar.component';

describe('UserAvatarComponent', () => {
  let component: UserAvatarComponent;
  let fixture: ComponentFixture<UserAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAvatarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the first letter of the user name', () => {
    component.userName = 'John Doe';
    fixture.detectChanges();
    expect(component.initials).toBe('J');
  });

  it('should display uppercase initial', () => {
    component.userName = 'alice';
    fixture.detectChanges();
    expect(component.initials).toBe('A');
  });

  it('should handle empty userName', () => {
    component.userName = '';
    fixture.detectChanges();
    expect(component.initials).toBe('');
  });

  it('should apply correct size class', () => {
    component.size = 'small';
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const avatarElement = element.querySelector('.user-avatar');
    expect(avatarElement?.classList.contains('size-small')).toBeTruthy();
  });
});
