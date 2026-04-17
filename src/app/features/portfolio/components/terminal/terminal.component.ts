import {
  Component, OnInit, OnDestroy, ViewChild,
  ElementRef, AfterViewChecked, AfterViewInit, signal, HostListener, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TerminalService } from '../../services/terminal.service';
import { SafeHtmlPipe } from '../../../../shared/pipes/safe-html.pipe';

@Component({
    selector: 'app-terminal',
    imports: [CommonModule, FormsModule, SafeHtmlPipe],
    templateUrl: './terminal.component.html',
    styleUrl: './terminal.component.scss'
})
export class TerminalComponent implements OnInit, AfterViewInit, OnDestroy, AfterViewChecked {
  @ViewChild('terminalBody') terminalBody!: ElementRef;
  @ViewChild('terminalInput') terminalInput!: ElementRef;

  inputValue = '';
  isMobile = signal(false);
  motdLines = signal<string[]>([]);
  motdDone = signal(false);
  showCursor = signal(true);

  showOnboarding = signal(false);
  demoTyped = signal('');
  demoOutputVisible = signal(false);
  demoCursorVisible = signal(true);

  private onboardCursorInterval: any;

  private motdFull = [
    `<span style="color:#555">┌──────────────────────────────────────────────────┐</span>`,
    `<span style="color:#555">│</span>  <span style="color:#fff;font-weight:700">Nor Dayana Athira</span>  <span style="color:#555">·</span>  <span style="color:#22c55e">Backend Software Engineer</span>`,
    `<span style="color:#555">│</span>  <span style="color:#555">TM Research &amp; Development  ·  Cyberjaya, MY</span>`,
    `<span style="color:#555">│</span>  <span style="color:#facc15">NestJS</span><span style="color:#555"> · </span><span style="color:#facc15">Node.js</span><span style="color:#555"> · </span><span style="color:#facc15">TypeScript</span><span style="color:#555"> · </span><span style="color:#facc15">PostgreSQL</span><span style="color:#555"> · </span><span style="color:#facc15">Docker</span>`,
    `<span style="color:#555">│</span>  <span style="color:#22c55e">●</span>  <span style="color:#22c55e">Open to Work</span>  <span style="color:#555">· last login: ${new Date().toDateString()}</span>`,
    `<span style="color:#555">└──────────────────────────────────────────────────┘</span>`,
    `<span style="color:#555">type </span><span style="color:#22c55e">help</span><span style="color:#555"> or click a shortcut below to explore.</span>`,
  ];
  private cursorInterval: any;
  private shouldScroll = false;
  private onboardTypingTimeout: any;

  private visibilityObserver?: IntersectionObserver;

  constructor(public terminal: TerminalService, private el: ElementRef) {
    effect(() => {
      terminal.scrollTick();
      this.shouldScroll = true;
    });
  }

  ngOnInit() {
    this.checkMobile();
    this.animateMotd();
    this.cursorInterval = setInterval(() => {
      this.showCursor.update(v => !v);
    }, 530);
    this.showOnboarding.set(true);
  }

  ngAfterViewInit() {
    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.visibilityObserver?.disconnect();
          this.startOnboardDemo();
        }
      },
      { threshold: 0.3 }
    );
    this.visibilityObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    clearInterval(this.cursorInterval);
    clearInterval(this.onboardCursorInterval);
    clearTimeout(this.onboardTypingTimeout);
    this.visibilityObserver?.disconnect();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  @HostListener('window:resize')
  onResize() { this.checkMobile(); }

  private checkMobile() {
    this.isMobile.set(window.innerWidth < 768);
  }

  private animateMotd() {
    let i = 0;
    const interval = setInterval(() => {
      if (i < this.motdFull.length) {
        this.motdLines.update(l => [...l, this.motdFull[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.motdDone.set(true);
          this.terminal.run('help');
          setTimeout(() => this.focusInput(), 100);
        }, 300);
      }
    }, 180);
  }

  onEnter() {
    const val = this.inputValue.trim();
    if (!val) return;
    this.terminal.run(val);
    this.inputValue = '';
  }

  runShortcut(cmd: string) {
    this.terminal.run(cmd);
  }

  focusInput() {
    setTimeout(() => this.terminalInput?.nativeElement?.focus({ preventScroll: true }), 50);
  }

  focusOnClick() {
    this.terminalInput?.nativeElement?.focus({ preventScroll: true });
  }

/**
 * Starts an onboarding demo of the terminal.
 * Types out the command 'whoami' and then displays the output.
 * The demo is triggered after a 700ms delay.
 * The typing animation is done by using a timer to update the demoTyped signal.
 * The output is displayed after a 450ms delay after the typing animation is complete.
 */
  private startOnboardDemo() {
    const cmd = 'whoami';
    let i = 0;
    this.onboardCursorInterval = setInterval(() => {
      this.demoCursorVisible.update(v => !v);
    }, 530);
    this.onboardTypingTimeout = setTimeout(() => {
      const t = setInterval(() => {
        if (i < cmd.length) {
          this.demoTyped.update(s => s + cmd[i++]);
        } else {
          clearInterval(t);
          setTimeout(() => this.demoOutputVisible.set(true), 450);
        }
      }, 90);
    }, 700);
  }

  /**
   * Dismiss the onboarding popup and reset all related state and timers.
   * This will clear any ongoing typing animation, hide the output of the demo command,
   * and focus the input field.
   */
  dismissOnboarding() {
    this.showOnboarding.set(false);
    clearInterval(this.onboardCursorInterval);
    clearTimeout(this.onboardTypingTimeout);
    this.demoTyped.set('');
    this.demoOutputVisible.set(false);
    this.focusInput();
  }

  private scrollToBottom() {
    try {
      const el = this.terminalBody.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  get shortcuts() {
    return [
      { label: 'help',        cmd: 'help' },
      { label: 'whoami',      cmd: 'whoami' },
      { label: 'ls projects', cmd: 'ls projects' },
      { label: 'ls stack',    cmd: 'ls stack' },
      { label: 'git log',     cmd: 'git log' },
      { label: 'cat tmrnd',   cmd: 'cat tmrnd' },
      { label: 'cat epnox',   cmd: 'cat epnox' },
      { label: 'cat education', cmd: 'cat education' },
      { label: 'cat hobbies',  cmd: 'cat hobbies' },
      { label: 'cat contact',  cmd: 'cat contact' },
      { label: 'clear',       cmd: 'clear' },
    ];
  }
}
