import { Component, OnInit, OnDestroy, AfterViewInit, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Profile } from '../../shared/models';
import { TerminalComponent } from '../portfolio/components/terminal/terminal.component';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, TerminalComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  profile = signal<Profile | null>(null);
  showScrollTop = signal(false);

  private observer!: IntersectionObserver;

  constructor(private api: ApiService, private el: ElementRef) {}

  ngOnInit() {
    this.api.getProfile().subscribe((p) => this.profile.set(p));
  }

  ngAfterViewInit() {
    const terminalSection = this.el.nativeElement.querySelector('#terminal-section');
    if (!terminalSection) return;

    this.observer = new IntersectionObserver(
      ([entry]) => this.showScrollTop.set(entry.isIntersecting),
      { threshold: 0.1 }
    );
    this.observer.observe(terminalSection);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  scrollToTerminal() {
    document.getElementById('terminal-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToTop() {
    this.el.nativeElement.querySelector('.hero')?.scrollIntoView({ behavior: 'smooth' });
  }
}
