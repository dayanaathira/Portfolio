import { Injectable, signal } from "@angular/core";
import { forkJoin } from "rxjs";
import { ApiService } from "../../../core/services/api.service";
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
} from "../../../shared/models";
import { SkillsEnum } from "../../../../app/shared/enums/skill-category.enum";
import { environment } from "../../../../environments/environment";
import {
  TERMINAL_COMMANDS, CAT_ALIASES, WORDLE_WORDS,
  RESUME, HIDDEN_DIR, WORDLE_CONFIG,
  DOCKER_CONTAINERS, PIPELINE_STAGES, FILESYSTEM_ENTRIES,
} from "../../../shared/enums/terminal.constants";

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

  // ── Hidden directory & Wordle state ──────────────────────────────────────
  currentDir = signal('~');
  private wordleActive = false;
  private wordleWord = '';
  private wordleGuesses: string[] = [];

  readonly COMMANDS = TERMINAL_COMMANDS;
  private readonly catAliases = CAT_ALIASES;

  // Map each command string → its handler. Aliases share the same handler reference.
  private readonly commandMap = new Map<string, () => string>([
    ["help", () => this.cmdHelp()],
    ["whoami", () => this.cmdWhoami()],
    ["ls projects", () => this.cmdProjects()],
    ["ls", () => this.currentDir() === HIDDEN_DIR ? this.eggLsHidden() : this.cmdProjects()],
    ["ls stack", () => this.cmdStack()],
    ["cat stack", () => this.cmdStack()],
    ["git log", () => this.cmdGitLog()],
    ["git log --oneline", () => this.cmdGitLog()],
    ["git stash list", () => this.eggGitStashList()],
    ["git stash pop", () => this.eggGitStashPop()],
    ["cat education", () => this.cmdEducation()],
    ["cat hobbies", () => this.cmdHobbies()],
    ["cat contact", () => this.cmdContact()],
    ["curl contact", () => this.cmdContact()],
    ["docker ps", () => this.cmdDockerPs()],
    ["cat pipeline", () => this.cmdPipeline()],
    // ── Easter eggs ──────────────────────────────────────────────────────
    ["vim", () => this.eggVim()],
    ["nano", () => this.eggVim()],
    [":q", () => this.eggVimExit()],
    [":q!", () => this.eggVimExit()],
    [":wq", () => this.eggVimExit()],
    ["exit", () => this.eggExit()],
    ["quit", () => this.eggExit()],
    ["pwd", () => this.eggPwd()],
    ["ls -a", () => this.eggLsLa()],
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

    // Wordle game intercepts all input while active
    if (this.wordleActive) {
      this.handleWordleGuess(cmd);
      return;
    }

    // Async commands that manage their own output
    if (cmd === "pdf resume") {
      this.cmdResume();
      return;
    }
    if (cmd === "curl /api/health") {
      this.cmdApiHealth();
      return;
    }

    // Named commands (including cat education/hobbies/contact) take priority
    if (this.commandMap.has(cmd)) {
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

    // Pattern: ./wordle — only works inside .hidden
    if (cmd === "./wordle" || cmd === "wordle") {
      if (this.currentDir() === HIDDEN_DIR) {
        this.startWordle();
      } else {
        this.pushOutput(`<span class="red">bash: ./wordle: No such file or directory</span>`);
      }
      return;
    }

    // Pattern: cd <anything> — normalise trailing slashes
    const cdTarget = cmd.startsWith("cd ") ? cmd.slice(3).replace(/\/+$/, "") : "";
    if (cdTarget === HIDDEN_DIR) {
      this.currentDir.set(HIDDEN_DIR);
      this.pushOutput(this.eggCdHidden());
      return;
    }
    if (cmd === "cd" || cdTarget === "~" || cdTarget === "..") {
      this.currentDir.set("~");
      this.pushOutput(`<span class="dim">Back to </span><span class="wht">~/portfolio</span><span class="dim">.</span>`);
      return;
    }
    if (cmd.startsWith("cd ")) {
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
              s.profiency === SkillsEnum.Expert
                ? "grn"
                : s.profiency === SkillsEnum.Intermediate
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
    const hiddenCommit = `<div class="t-log-row" style="opacity:0.4">
        <span class="dim">* </span><span class="yel">1337c0d</span>
        <span class="dim">chore: clean up old experiments... or did I?</span>
      </div>`;
    return `<div class="t-out" style="margin-bottom:6px">${rows}${hiddenCommit}
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

  private cmdDockerPs(): string {
    const rows = DOCKER_CONTAINERS.map(c =>
      `<tr>
        <td class="dim">${c.id}</td>
        <td class="wht">${c.image}</td>
        <td class="grn">Up ${c.days} days, ${c.hrs} hours</td>
        <td class="yel">${c.ports}</td>
        <td class="grn">${c.name}</td>
      </tr>`
    ).join('');
    return `<div class="t-out" style="margin-bottom:6px">
  <span class="dim">CONTAINER ID   IMAGE                  STATUS              PORTS                      NAMES</span>
</div>
<table class="t-tbl"><tbody>${rows}</tbody></table>`;
  }

  private cmdApiHealth(): void {
    this.pushOutput(
      `<span class="t-loading">curl ${environment.apiUrl}/health</span>`,
    );
    this.api.getHealth().subscribe({
      next: (data) => {
        const ts = new Date().toISOString();
        const pretty = JSON.stringify(data, null, 2)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"([^"]+)":/g, '<span class="yel">"$1"</span>:')
          .replace(/: "([^"]+)"/g, ': <span class="wht">"$1"</span>')
          .replace(/: (\d+)/g, ': <span class="blu">$1</span>');
        this.replaceLastOutput(`<div class="t-out">
  <span class="dim">HTTP/1.1</span> <span class="grn">200 OK</span>
  <span class="dim">Content-Type: application/json · ${ts}</span><br>
  <pre style="margin:6px 0;font-family:inherit;white-space:pre-wrap">${pretty}</pre>
</div>`);
      },
      error: (err) => {
        const status = err?.status ?? 0;
        const msg =
          status === 0
            ? "could not reach server"
            : `HTTP ${status} — ${err?.statusText ?? "error"}`;
        this.replaceLastOutput(
          `<span class="red">curl: (7) ${msg}</span><span class="dim"> · is the API running?</span>`,
        );
      },
    });
  }

  private cmdPipeline(): string {
    const stages = PIPELINE_STAGES.map(s =>
      `<div class="t-log-row">
        <span class="grn">▸ ${s.name}</span>
        <span class="dim"> → ${s.detail}</span>
      </div>`
    ).join('');
    return `<div class="t-out" style="margin-bottom:6px">
  <span class="grn" style="font-weight:700">// CI/CD pipeline</span>
  <span class="dim"> · GitHub Actions → self-hosted server</span>
</div>
${stages}
<div class="t-log-row"><span class="dim">triggered on: push to </span><span class="wht">main</span></div>`;
  }

  private cmdResume(): void {
    this.pushOutput(`<span class="t-loading">opening resume</span>`);
    fetch(RESUME.path)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        const a = document.createElement("a");
        a.href = url;
        a.download = RESUME.filename;
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
    const path = this.currentDir() === HIDDEN_DIR
      ? '/home/dayana/portfolio/.hidden'
      : '/home/dayana/portfolio';
    return `<span class="wht">${path}</span>`;
  }

  private eggCd(): string {
    return `<span class="dim">You are already home. There is nowhere else to go.</span>`;
  }

  private eggRm(): string {
    return `<span class="red">rm: permission denied.</span> <span class="dim">This portfolio took too long to build.</span>`;
  }

  private eggLsLa(): string {
    const rows = FILESYSTEM_ENTRIES.map(e =>
      `<span class="dim">${e.perms}</span>  <span class="grn">dayana</span>  <span class="${e.cls}">${e.name}</span>`
    ).join('<br>  ');
    return `<div class="t-out">
  <span class="dim">total ${FILESYSTEM_ENTRIES.length * 6}</span><br>
  ${rows}
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

  private eggGitStashList(): string {
    return `<div class="t-out">
  <span class="yel">stash@{0}</span><span class="dim">: WIP: wordle prototype</span><br>
  <span class="dim">(hint: try </span><span class="grn">git stash pop</span><span class="dim"> to restore it)</span>
</div>`;
  }

  private eggGitStashPop(): string {
    return `<div class="t-out">
  <span class="grn">Dropped stash@{0}</span><span class="dim">.</span><br>
  <span class="dim">Restored 1 stashed file. Check your working directory —</span><br>
  <span class="dim">hint: try </span><span class="grn">ls -a</span>
</div>`;
  }

  private eggCdHidden(): string {
    return `<span class="dim">Entering </span><span class="wht">.hidden/</span><span class="dim"> — type </span><span class="grn">ls</span><span class="dim"> to see what's here.</span>`;
  }

  private eggLsHidden(): string {
    return `<div class="t-out">
  <span class="dim">-rwxr-xr-x</span>  <span class="grn">dayana</span>  <span class="grn">wordle</span><br>
  <span class="dim">(run </span><span class="grn">./wordle</span><span class="dim"> to play)</span>
</div>`;
  }

  // ── Wordle game ──────────────────────────────────────────────────────────

  private startWordle(): void {
    this.wordleWord = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
    this.wordleGuesses = [];
    this.wordleActive = true;
    const c = WORDLE_CONFIG.colors;
    this.pushOutput(`<div class="t-out">
  <span class="grn" style="font-weight:700;font-size:15px;letter-spacing:2px">WORDLE</span>  <span class="dim">— guess the ${WORDLE_CONFIG.wordLength}-letter word · ${WORDLE_CONFIG.maxTries} tries</span><br><br>
  <span style="background:${c.green.bg};padding:1px 6px;border-radius:3px;color:${c.green.fg};font-size:11px">green</span> <span class="dim">correct position &nbsp;</span>
  <span style="background:${c.yellow.bg};padding:1px 6px;border-radius:3px;color:${c.yellow.fg};font-size:11px">yellow</span> <span class="dim">wrong position &nbsp;</span>
  <span style="background:${c.grey.bg};padding:1px 6px;border-radius:3px;color:${c.grey.fg};font-size:11px">grey</span> <span class="dim">not in word</span><br><br>
  <span class="dim">type a ${WORDLE_CONFIG.wordLength}-letter word to guess · type </span><span class="yel">quit</span><span class="dim"> to exit</span>
</div>`);
  }

  private handleWordleGuess(guess: string): void {
    if (guess === 'quit' || guess === 'exit') {
      const word = this.wordleWord;
      this.wordleActive = false;
      this.wordleWord = '';
      this.wordleGuesses = [];
      this.pushOutput(`<span class="dim">Wordle exited. The word was </span><span class="yel">${word}</span><span class="dim">.</span>`);
      return;
    }

    if (guess.length !== WORDLE_CONFIG.wordLength || !/^[a-z]+$/.test(guess)) {
      this.pushOutput(`<span class="red">invalid:</span> <span class="dim">must be exactly 5 letters.</span>`);
      return;
    }

    this.wordleGuesses.push(guess);
    const row = this.wordleColorRow(guess, this.wordleWord);

    if (guess === this.wordleWord) {
      const tries = this.wordleGuesses.length;
      this.pushOutput(`${row}<br><span class="grn">🎉 correct! Got it in ${tries} ${tries === 1 ? 'try' : 'tries'}.</span> <span class="dim">Run </span><span class="grn">./wordle</span><span class="dim"> to play again.</span>`);
      this.wordleActive = false;
      this.wordleWord = '';
      this.wordleGuesses = [];
      return;
    }

    const remaining = WORDLE_CONFIG.maxTries - this.wordleGuesses.length;
    if (remaining === 0) {
      const word = this.wordleWord;
      this.wordleActive = false;
      this.wordleWord = '';
      this.wordleGuesses = [];
      this.pushOutput(`${row}<br><span class="red">game over.</span> <span class="dim">The word was </span><span class="yel">${word}</span><span class="dim">. Run </span><span class="grn">./wordle</span><span class="dim"> to try again.</span>`);
      return;
    }

    this.pushOutput(`${row}<br><span class="dim">${remaining} ${remaining === 1 ? 'guess' : 'guesses'} remaining</span>`);
  }

  private wordleColorRow(guess: string, target: string): string {
    const len = WORDLE_CONFIG.wordLength;
    const used = new Array(len).fill(false);
    const colors = new Array(len).fill('grey');

    // First pass: greens
    for (let i = 0; i < len; i++) {
      if (guess[i] === target[i]) {
        colors[i] = 'green';
        used[i] = true;
      }
    }

    // Second pass: yellows
    for (let i = 0; i < len; i++) {
      if (colors[i] === 'green') continue;
      for (let j = 0; j < len; j++) {
        if (!used[j] && guess[i] === target[j]) {
          colors[i] = 'yellow';
          used[j] = true;
          break;
        }
      }
    }

    const c = WORDLE_CONFIG.colors;
    const tiles = guess.split('').map((ch, i) => {
      const { bg, fg } = colors[i] === 'green' ? c.green : colors[i] === 'yellow' ? c.yellow : c.grey;
      return `<span style="background:${bg};color:${fg};width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;font-weight:700;font-size:14px;text-transform:uppercase">${ch}</span>`;
    }).join('');

    return `<span style="display:inline-flex;gap:5px">${tiles}</span>`;
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
    this.lines.update((l) => [...l, { type: "input", content: cmd, dir: this.currentDir() }]);
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
