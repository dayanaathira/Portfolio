import { Injectable, signal } from "@angular/core";
import { forkJoin } from "rxjs";
import { ApiService } from "./api.service";
import { getHobbySvg } from "./hobby-svgs";
import {
  Profile,
  Project,
  Skill,
  ExperienceEntry,
  ExperienceDetail,
  Education,
  Hobby,
  TerminalLine,
  Command,
} from "../models";

@Injectable({ providedIn: "root" })
export class TerminalService {
  lines = signal<TerminalLine[]>([]);
  scrollTick = signal(0);

  private profile!: Profile;
  private projects!: Project[];
  private stack!: Skill[];
  private experience!: ExperienceEntry[];
  private education!: Education[];
  private hobbies: Hobby[] = [];
  private dataLoaded = false;
  private pendingQueue: string[] = [];
  private sessionHistory: string[] = [];

  readonly COMMANDS: Command[] = [
    { key: "help", description: "show available commands" },
    { key: "whoami", description: "who is Dayana?" },
    {
      key: "ls projects",
      description: "list all projects",
      aliases: ["ls projects"],
    },
    {
      key: "ls stack",
      description: "tech stack & skill levels",
      aliases: ["cat stack"],
    },
    {
      key: "git log",
      description: "work experience timeline",
      aliases: ["git log --oneline"],
    },
    {
      key: "cat <company>",
      description: "full details for a work experience  (e.g. cat tmrnd)",
    },
    { key: "cat education", description: "academic background" },
    { key: "cat hobbies", description: "life outside the terminal" },
    {
      key: "cat contact",
      description: "get in touch",
      aliases: ["curl contact"],
    },
    { key: "pdf resume", description: "download my resume" },
    { key: "clear", description: "clear terminal" },
  ];

  private readonly catAliases: Record<string, number> = {
    tmrnd: 1,
    epnox: 2,
  };

  // Map each command string → its handler. Aliases share the same handler reference.
  private readonly commandMap = new Map<string, () => string>([
    ["help", () => this.cmdHelp()],
    ["whoami", () => this.cmdWhoami()],
    ["ls projects", () => this.cmdProjects()],
    ["ls", () => this.cmdProjects()],
    ["ls stack", () => this.cmdStack()],
    ["cat stack", () => this.cmdStack()],
    ["git log", () => this.cmdGitLog()],
    ["git log --oneline", () => this.cmdGitLog()],
    ["cat education", () => this.cmdEducation()],
    ["cat hobbies", () => this.cmdHobbies()],
    ["cat contact", () => this.cmdContact()],
    ["curl contact", () => this.cmdContact()],
    // ── Easter eggs ──────────────────────────────────────────────────────
    ["vim", () => this.eggVim()],
    ["nano", () => this.eggVim()],
    [":q", () => this.eggVimExit()],
    [":q!", () => this.eggVimExit()],
    [":wq", () => this.eggVimExit()],
    ["exit", () => this.eggExit()],
    ["quit", () => this.eggExit()],
    ["pwd", () => this.eggPwd()],
    ["ls -la", () => this.eggLsLa()],
    ["git status", () => this.eggGitStatus()],
    ["git push", () => this.eggGitPush()],
    ["git pull", () => this.eggGitPull()],
    ["history", () => this.eggHistory()],
    ["npm install", () => this.eggNpm()],
    ["npm i", () => this.eggNpm()],
  ]);

  constructor(private api: ApiService) {
    this.loadData();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  run(raw: string): void {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    if (cmd === "clear") {
      this.lines.set([]);
      return;
    }

    if (!this.dataLoaded) {
      this.pendingQueue.push(raw);
      return;
    }

    this.dispatch(raw);
  }

  // ── Data loading ────────────────────────────────────────────────────────

  private loadData(): void {
    forkJoin({
      profile: this.api.getProfile(),
      projects: this.api.getProjects(),
      stack: this.api.getStack(),
      experience: this.api.getExperience(),
      education: this.api.getEducation(),
      hobbies: this.api.getHobbies(),
    }).subscribe({
      next: (data) => {
        Object.assign(this, data);
        this.dataLoaded = true;
        this.pendingQueue.forEach((raw) => this.dispatch(raw));
        this.pendingQueue = [];
      },
      error: () => {
        this.pushOutput(
          `<span class="red">error:</span> <span class="dim">could not reach the API. please try again later.</span>`,
        );
        this.pendingQueue = [];
      },
    });
  }

  // ── Command dispatch ────────────────────────────────────────────────────

  private dispatch(raw: string): void {
    const cmd = raw.trim().toLowerCase();
    this.pushInput(raw.trim());
    this.sessionHistory.push(raw.trim());

    // Named commands (including cat education/hobbies/contact) take priority
    if (this.commandMap.has(cmd) || cmd === "pdf resume") {
      this.pushOutput(this.resolve(cmd));
      return;
    }

    // Pattern: sudo <anything>
    if (cmd === "sudo" || cmd.startsWith("sudo ")) {
      this.pushOutput(this.eggSudo(cmd));
      return;
    }

    // Pattern: rm <anything>
    if (cmd.startsWith("rm ")) {
      this.pushOutput(this.eggRm());
      return;
    }

    // Pattern: ping <target>
    const pingMatch = cmd.match(/^ping\s+(\S+)$/);
    if (pingMatch) {
      this.pushOutput(this.eggPing(pingMatch[1]));
      return;
    }

    // Pattern: cd <anything>
    if (cmd === "cd" || cmd.startsWith("cd ")) {
      this.pushOutput(this.eggCd());
      return;
    }

    // Remaining `cat <x>` patterns → work experience lookup
    const catMatch = cmd.match(/^cat\s+(\S+)$/);
    if (catMatch) {
      this.handleCatCommand(catMatch[1]);
      return;
    }

    this.pushOutput(this.resolve(cmd));
  }

  private resolve(cmd: string): string {
    if (cmd === "pdf resume") {
      this.cmdResume();
      return "";
    }

    return (
      this.commandMap.get(cmd)?.() ??
      `<span class="red">command not found:</span> <span class="wht">${cmd}</span><span class="dim"> — type </span><span class="grn">help</span><span class="dim"> for commands.</span>`
    );
  }

  private handleCatCommand(token: string): void {
    const numId = parseInt(token, 10);
    if (!isNaN(numId)) {
      if (numId < 1 || numId > 9999) {
        this.pushOutput(
          `<span class="red">invalid id</span><span class="dim"> · id must be a positive integer.</span>`,
        );
        return;
      }
      this.cmdCat(numId);
      return;
    }

    const aliasId = this.catAliases[token];
    if (aliasId !== undefined) {
      this.cmdCat(aliasId);
      return;
    }

    const available = Object.keys(this.catAliases)
      .map((a) => `<span class="grn">${a}</span>`)
      .join(", ");
    this.pushOutput(
      `<span class="red">not found:</span><span class="dim"> · try: </span>${available}`,
    );
  }

  // ── Command handlers ────────────────────────────────────────────────────

  private cmdHelp(): string {
    const rows = this.COMMANDS.filter((c) => !c.key.startsWith("cat <")).map(
      (c) => {
        const row = `<span class="yel">${c.key.padEnd(18)}</span><span class="dim">→</span> <span class="wht">${c.description}</span>`;
        if (c.key !== "git log") return row;
        const aliases = Object.keys(this.catAliases).join(", ");
        return (
          row +
          `<br><span class="dim">${"".padEnd(21)}• </span><span class="yel">cat &lt;${aliases}&gt;</span><span class="dim"> → full details for a work experience</span>`
        );
      },
    );
    return `<div class="t-out"><span class="grn">available commands:</span><br><br>${rows.join("<br>")}<br><br><span class="dim">tip: click the shortcuts below to run commands instantly.</span></div>`;
  }

  private cmdWhoami(): string {
    if (!this.profile) return this.errNoData();
    const p = this.profile;
    const stackPills = p.profileStacks
      .map((s) => `<span class="pill pm">${this.esc(s.name)}</span>`)
      .join("");
    return `<div class="t-box">
      <div class="t-row"><span class="t-k">name</span><span class="wht">${this.esc(p.name)}</span></div>
      <div class="t-row"><span class="t-k">role</span><span class="grn">${this.esc(p.role)}</span></div>
      <div class="t-row"><span class="t-k">experience</span><span class="wht">${this.esc(p.yearsOfExperience)}</span></div>
      <div class="t-row"><span class="t-k">location</span><span class="wht">${this.esc(p.location)}</span></div>
      <div class="t-row"><span class="t-k">status</span><span class="yel">${this.esc(p.status.name)}</span></div>
      <div class="t-row"><span class="t-k">stack</span><span style="display:flex;flex-wrap:wrap;gap:3px">${stackPills}</span></div>
      </div>`;
  }

  private cmdProjects(): string {
    if (!this.projects.length) return this.errNoData();
    const rows = this.projects
      .map(
        (p, i) => `
      <tr>
        <td class="grn">${String(i + 1).padStart(3, "0")} ${this.esc(p.name)}/</td>
        <td>${p.projectStacks
          .slice(0, 3)
          .map((s) => `<span class="pill pm">${this.esc(s.name)}</span>`)
          .join("")}</td>
        <td class="yel">${this.esc(p.impact)}</td>
        <td class="grn">${this.esc(p.status.name)}</td>
      </tr>`,
      )
      .join("");
    return `<div class="t-out"><span class="dim">total ${this.projects.length} · sorted by impact</span></div>
      <table class="t-tbl">
        <thead><tr><th>project</th><th>stack</th><th>impact</th><th>status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  private cmdStack(): string {
    if (!this.stack.length) return this.errNoData();
    const grouped = this.stack.reduce<Record<string, typeof this.stack>>(
      (acc, s) => {
        (acc[s.category] ??= []).push(s);
        return acc;
      },
      {},
    );
    const sections = Object.entries(grouped)
      .map(([category, skills]) => {
        const pills = skills
          .map((s) => {
            const cls =
              s.profiency === "Expert"
                ? "grn"
                : s.profiency === "Intermediate"
                  ? "yel"
                  : "dim";
            return `<span class="pill pm"><span class="${cls}">${this.esc(s.name)}</span></span>`;
          })
          .join("");
        return `<div class="t-section-hdr">// ${this.esc(category.toLowerCase())}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${pills}</div>`;
      })
      .join("");
    return `<div class="t-out" style="margin-bottom:8px"><span class="grn">skills · by category</span></div>${sections}`;
  }

  private cmdGitLog(): string {
    if (!this.experience.length) return this.errNoData();
    const rows = this.experience
      .map((e) => {
        const hash = String(e.id).padStart(7, "0");
        const head = e.duration.toLowerCase().includes("present")
          ? '<span class="wht">(HEAD → main)</span>'
          : "";
        return `<div class="t-log-row">
        <span class="dim">* </span><span class="yel">${hash}</span> ${head}
        <span class="grn">feat:</span>
        <span class="wht">${this.esc(e.role)} @ ${this.esc(e.company)} · ${this.esc(e.duration)}</span>
        <span class="dim"> [${this.esc(e.type)}]</span>
      </div>`;
      })
      .join("");
    const idHint = this.experience.map((e) => e.id).join(" | ");
    return `<div class="t-out" style="margin-bottom:6px">${rows}
      <br><span class="dim">tip: </span><span class="wht">cat &lt;${idHint}&gt;</span><span class="dim"> to read full details</span>
    </div>`;
  }

  private cmdCat(id: number): void {
    if (isNaN(id)) {
      const ids = this.experience
        .map((e) => `<span class="grn">${e.id}</span>`)
        .join(", ");
      this.pushOutput(
        `<span class="red">invalid id</span><span class="dim"> · available ids: </span>${ids}`,
      );
      return;
    }
    this.pushOutput(`<span class="t-loading">fetching details</span>`);
    this.api.getExperienceBySlug(id).subscribe({
      next: (d: ExperienceDetail) => {
        const grouped = d.details.reduce<Record<string, string[]>>(
          (acc, item) => {
            (acc[item.name] ??= []).push(item.description);
            return acc;
          },
          {},
        );
        const sections = Object.entries(grouped)
          .map(
            ([title, bullets]) => `
          <div class="t-section-hdr">// ${this.esc(title.toLowerCase())}</div>
          ${bullets.map((b) => `<div class="t-bullet"><span class="grn t-bullet-dot">▸</span><span>${this.esc(b)}</span></div>`).join("")}
        `,
          )
          .join("");
        const stackPills = d.experienceStack
          .map((s) => `<span class="pill pm">${this.esc(s.name)}</span>`)
          .join("");
        this.replaceLastOutput(`<div class="t-box">
          <div class="t-row"><span class="t-k">role</span><span class="grn">${this.esc(d.role)}</span></div>
          <div class="t-row"><span class="t-k">company</span><span class="wht">${this.esc(d.company)}</span></div>
          <div class="t-row"><span class="t-k">location</span><span class="wht">${this.esc(d.location)}</span></div>
          <div class="t-row"><span class="t-k">duration</span><span class="yel">${this.esc(d.duration)}</span></div>
          <div class="t-row"><span class="t-k">type</span><span class="dim">${this.esc(d.type)}</span></div>
          ${sections}
          <div class="t-section-hdr">// stack used</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${stackPills}</div>
        </div>`);
      },
      error: () => this.replaceLastOutput(this.errNoData()),
    });
  }

  private cmdEducation(): string {
    if (!this.education?.length) return this.errNoData();
    return this.education
      .map(
        (e) => `<div class="t-box">
      <div class="t-row"><span class="t-k">degree</span><span class="grn">${this.esc(e.degree)}</span></div>
      <div class="t-row"><span class="t-k">field</span><span class="wht">${this.esc(e.fieldOfStudy)}</span></div>
      <div class="t-row"><span class="t-k">institution</span><span class="wht">${this.esc(e.name)}</span></div>
      <div class="t-row"><span class="t-k">period</span><span class="yel">${e.startDate} – ${e.endDate}</span></div>
    </div>`,
      )
      .join("");
  }

  private cmdHobbies(): string {
    if (!this.hobbies?.length) return this.errNoData();
    const panels = this.hobbies
      .map(
        (h) => `
<div style="min-width:200px;max-width:280px">
  <div class="t-section-hdr">// ${this.esc(h.category.name.toLowerCase())}</div>
  ${getHobbySvg(h.category.id)}
  <div class="t-out" style="font-size:12px;color:#888;line-height:1.7;max-width:260px">${this.esc(h.description)}</div>
</div>`,
      )
      .join("");
    return `<div class="t-out" style="margin-bottom:10px"><span class="grn" style="font-weight:700">// hobbies &amp; future dreams</span></div>
<div style="display:flex;gap:40px;flex-wrap:wrap">${panels}</div>`;
  }

  private cmdContact(): string {
    if (!this.profile) return this.errNoData();
    const p = this.profile;
    return `<div class="t-out">
      <span class="grn">200 OK</span> · drop a message, she will get back to you.<br>
      <span class="dim">→ email   :</span> <span class="blu">${this.esc(p.email)}</span><br>
      <span class="dim">→ github  :</span> <a class="blu" href="${this.esc(p.github)}" target="_blank" rel="noopener noreferrer">${this.esc(p.github)}</a><br>
      <span class="dim">→ linkedin:</span> <a class="blu" href="${this.esc(p.linkedin)}" target="_blank" rel="noopener noreferrer">${this.esc(p.linkedin)}</a><br>
    </div>`;
  }

  private cmdResume(): void {
    const pdfPath = "assets/Dayana Athira - Backend Software Engineer.pdf";
    this.pushOutput(`<span class="t-loading">opening resume</span>`);
    fetch(pdfPath)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        const a = document.createElement("a");
        a.href = url;
        a.download = "Dayana Athira - Backend Software Engineer.pdf";
        a.click();
        URL.revokeObjectURL(url);
        this.replaceLastOutput(
          `<span class="grn">✓ resume opened</span><span class="dim"> · check your downloads or the new tab.</span>`,
        );
      })
      .catch(() =>
        this.replaceLastOutput(
          `<span class="red">error:</span> <span class="dim">could not load resume. please try again later.</span>`,
        ),
      );
  }

  // ── XXXX XXX ─────────────────────────────────────────────────────────

  private eggSudo(cmd: string): string {
    const subcmd = cmd.replace(/^sudo\s*/, "").trim();
    if (subcmd === "rm -rf /" || subcmd === "rm -rf *") return this.eggRm();
    return `<span class="red">sudo: permission denied.</span> <span class="dim">Nice try though.</span>`;
  }

  private eggVim(): string {
    return `<span class="dim">Entering vim...</span> <span class="wht">wait, how do I exit this thing?</span><br><span class="dim">hint: type </span><span class="grn">:q!</span><span class="dim"> to escape (or so they say)</span>`;
  }

  private eggVimExit(): string {
    return `<span class="grn">✓</span> <span class="dim">Escaped vim. You are one of the few.</span>`;
  }

  private eggExit(): string {
    return `<span class="dim">There is no escape. You are here forever.</span>`;
  }

  private eggPwd(): string {
    return `<span class="wht">/home/dayana/portfolio</span>`;
  }

  private eggCd(): string {
    return `<span class="dim">You are already home. There is nowhere else to go.</span>`;
  }

  private eggRm(): string {
    return `<span class="red">rm: permission denied.</span> <span class="dim">This portfolio took too long to build.</span>`;
  }

  private eggLsLa(): string {
    const row = (perms: string, name: string, cls: string) =>
      `<span class="dim">${perms}</span>  <span class="grn">dayana</span>  <span class="${cls}">${name}</span>`;
    return `<div class="t-out">
  <span class="dim">total 42</span><br>
  ${row("drwxr-xr-x", "portfolio/", "wht")}<br>
  ${row("drwxr-xr-x", "projects/", "wht")}<br>
  ${row("drwxr-xr-x", "experience/", "wht")}<br>
  ${row("drwxr-xr-x", "stack/", "wht")}<br>
  ${row("-rw-r--r--", "resume.pdf", "yel")}<br>
  ${row("-rw-r--r--", "hobbies.txt", "wht")}<br>
  ${row("-rwxr-xr-x", "life.sh", "grn")}
</div>`;
  }

  private eggGitStatus(): string {
    return `<div class="t-out">
  <span class="grn">On branch</span> <span class="wht">main</span><br>
  <span class="dim">Your branch is up to date with 'origin/main'.</span><br><br>
  <span class="grn">nothing to commit, working tree clean</span><br>
  <span class="dim">(but always something to learn)</span>
</div>`;
  }

  private eggGitPush(): string {
    return `<span class="dim">Pushing to origin/main...</span><br><span class="grn">✓</span> <span class="wht">Already up to date.</span> <span class="dim">This portfolio ships continuously.</span>`;
  }

  private eggGitPull(): string {
    return `<span class="dim">remote: Counting objects...</span><br><span class="grn">✓</span> <span class="wht">Already up to date.</span> <span class="dim">You cannot pull what is already perfect.</span>`;
  }

  private eggPing(target: string): string {
    const t = this.esc(target);
    return `<div class="t-out">
  <span class="dim">PING ${t} — 56 bytes of data</span><br>
  <span class="grn">64 bytes from ${t}: icmp_seq=1 ttl=64 time=0.1 ms</span><br>
  <span class="grn">64 bytes from ${t}: icmp_seq=2 ttl=64 time=0.1 ms</span><br>
  <span class="grn">64 bytes from ${t}: icmp_seq=3 ttl=64 time=0.1 ms</span><br>
  <span class="dim">--- ${t} ping statistics ---</span><br>
  <span class="wht">3 packets transmitted, 3 received, 0% packet loss</span>
</div>`;
  }

  private eggHistory(): string {
    if (!this.sessionHistory.length)
      return `<span class="dim">no commands in history yet.</span>`;
    const rows = this.sessionHistory
      .map(
        (c, i) =>
          `  <span class="dim">${String(i + 1).padStart(3)}</span>  <span class="wht">${this.esc(c)}</span>`,
      )
      .join("<br>");
    return `<div class="t-out">${rows}</div>`;
  }

  private eggNpm(): string {
    return `<span class="dim">npm warn deprecated everything@∞.0.0</span><br><span class="dim">added 847 packages in </span><span class="wht">3 years</span>`;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private esc(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private errNoData(): string {
    return `<span class="red">error:</span> <span class="dim">data not available. check API connection.</span>`;
  }

  private pushInput(cmd: string): void {
    this.lines.update((l) => [...l, { type: "input", content: cmd }]);
  }

  private pushOutput(html: string): void {
    this.lines.update((l) => [
      ...l,
      { type: "output", content: html, html: true },
    ]);
    this.scrollTick.update((n) => n + 1);
  }

  private replaceLastOutput(html: string): void {
    this.lines.update((l) => {
      const updated = [...l];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].type === "output") {
          updated[i] = { type: "output", content: html, html: true };
          break;
        }
      }
      return updated;
    });
    this.scrollTick.update((n) => n + 1);
  }
}
