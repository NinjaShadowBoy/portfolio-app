import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CvMenuComponent } from './cv-menu.component';
import { CV_PATHS } from '../../../core/constants/cv';

describe('CvMenuComponent', () => {
  let fixture: ComponentFixture<CvMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CvMenuComponent] }).compileComponents();
    fixture = TestBed.createComponent(CvMenuComponent);
    fixture.detectChanges();
  });

  it('opens a menu with a download link per language', () => {
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button')!;
    const menu = el.querySelector('[popover]')!;
    expect(button.getAttribute('popovertarget')).toBe(menu.id);

    const links = Array.from(menu.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([CV_PATHS.en, CV_PATHS.fr]);
    expect(links.every((a) => a.hasAttribute('download'))).toBe(true);
  });

  it('gives each instance its own menu id', () => {
    const other = TestBed.createComponent(CvMenuComponent);
    other.detectChanges();
    const id = (f: ComponentFixture<CvMenuComponent>) => (f.nativeElement as HTMLElement).querySelector('[popover]')!.id;
    expect(id(other)).not.toBe(id(fixture));
  });
});
