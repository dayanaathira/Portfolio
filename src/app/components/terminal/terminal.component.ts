import {
  Component, OnInit, OnDestroy, ViewChild,
  ElementRef, AfterViewChecked, signal, HostListener, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TerminalService } from '../../services/terminal.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
    selector: 'app-terminal',
    imports: [CommonModule, FormsModule, SafeHtmlPipe],
    templateUrl: './terminal.component.html',
    styleUrl: './terminal.component.scss'
})
export class TerminalComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('terminalBody') terminalBody!: ElementRef;
  @ViewChild('terminalInput') terminalInput!: ElementRef;

  inputValue = '';
  isMobile = signal(false);
  motdLines = signal<string[]>([]);
  motdDone = signal(false);
  showCursor = signal(true);

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

  constructor(public terminal: TerminalService) {
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
  }

  ngOnDestroy() {
    clearInterval(this.cursorInterval);
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
    setTimeout(() => this.terminalInput?.nativeElement?.focus(), 50);
  }

  focusOnClick() {
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
      { label: 'education',   cmd: 'education' },
      { label: 'contact',     cmd: 'contact' },
      { label: 'clear',       cmd: 'clear' },
    ];
  }
}
