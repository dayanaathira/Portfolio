import { Injectable, signal } from "@angular/core";
import { ApiService } from "./api.service";
import {
  Profile,
  Project,
  Skill,
  ExperienceEntry,
  ExperienceDetail,
  Education,
  TerminalLine,
  Command,
} from "../models";
import { forkJoin } from "rxjs";

@Injectable({ providedIn: "root" })
export class TerminalService {
  lines = signal<TerminalLine[]>([]);
  scrollTick = signal(0);

  private profile!: Profile;
  private projects!: Project[];
  private stack!: Skill[];
  private experience!: ExperienceEntry[];
  private education!: Education[];
  private dataLoaded = false;
  private pendingQueue: string[] = [];

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
    { key: "cat <company>", description: "full details for a work experience  (e.g. cat tmrnd)" },
    { key: "education", description: "academic background" },
    { key: "contact", description: "get in touch", aliases: ["curl contact"] },
    { key: "pdf resume", description: "download my resume" },
    { key: "clear", description: "clear terminal" },
  ];

  constructor(private api: ApiService) {
    this.loadData();
  }

/**
 * Load all necessary data from the API.
 * When all data is loaded, set `dataLoaded` to `true` and dispatch all commands in the `pendingQueue`.
 * If an error occurs, push an error message to the output and clear the `pendingQueue`.
 */
  private loadData() {
    forkJoin({
      profile: this.api.getProfile(),
      projects: this.api.getProjects(),
      stack: this.api.getStack(),
      experience: this.api.getExperience(),
      education: this.api.getEducation(),
    }).subscribe({
      next: ({ profile, projects, stack, experience, education }) => {
        this.profile = profile;
        this.projects = projects;
        this.stack = stack;
        this.experience = experience;
        this.education = education;
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

  /**
   * Process a command from the user.
   * If the command is empty, do nothing.
   * If the command is "clear", clear the terminal.
   * If the data has not been loaded yet, add the command to a pending queue.
   * Otherwise, dispatch the command to be executed.
   * @param raw the command from the user
   */
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

  private readonly catAliases: Record<string, number> = {
    'tmrnd': 1,
    'epnox': 2,
  };

  /**
   * Dispatch a command to be executed.
   * If the command is "clear", clear the terminal.
   * If the command is "cat <company>", fetch the full details of a work experience.
   * If the command is "cat stack", show the tech stack and skill levels.
   * If the command is "git log", show the work experience timeline.
   * If the command is "cat <id>", fetch the full details of a work experience.
   * If the command is not recognized, push an error message to the output.
   * @param raw the command from the user
   */
  private dispatch(raw: string): void {
    const cmd = raw.trim().toLowerCase();
    this.pushInput(raw.trim());
    const catMatch = cmd.match(/^cat\s+(\S+)$/);
    if (catMatch && catMatch[1] !== "stack") {
      const token = catMatch[1];
      const numId = parseInt(token, 10);
      if (!isNaN(numId)) {
        if (numId < 1 || numId > 9999) {
          this.pushOutput(`<span class="red">invalid id</span><span class="dim"> · id must be a positive integer.</span>`);
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
        .map(a => `<span class="grn">${a}</span>`)
        .join(', ');
      this.pushOutput(`<span class="red">not found:</span><span class="dim"> · try: </span>${available}`);
      return;
    }
    this.pushOutput(this.resolve(cmd));
  }

/**
 * Resolve a command to its corresponding output string.
 * If the command is not recognized, return an error message.
 * @param cmd the command from the user
 * @returns the output string for the command
 */
  private resolve(cmd: string): string {
    if (cmd === "help") return this.cmdHelp();
    if (cmd === "whoami") return this.cmdWhoami();
    if (cmd === "ls projects" || cmd === "ls") return this.cmdProjects();
    if (cmd === "ls stack" || cmd === "cat stack") return this.cmdStack();
    if (cmd === "git log" || cmd === "git log --oneline")
      return this.cmdGitLog();
    if (cmd === "education") return this.cmdEducation();
    if (cmd === "contact" || cmd === "curl contact") return this.cmdContact();
    if (cmd === "pdf resume") { this.cmdResume(); return ""; }
    return `<span class="red">command not found:</span> <span class="wht">${cmd}</span><span class="dim"> — type </span><span class="grn">help</span><span class="dim"> for commands.</span>`;
  }

/**
 * Returns a string containing a list of available commands and their descriptions.
 * @returns a string containing the list of available commands
 */
  private cmdHelp(): string {
    const lines = this.COMMANDS
      .filter(c => !c.key.startsWith('cat <'))
      .map(c => {
        const row = `<span class="yel">${c.key.padEnd(18)}</span><span class="dim">→</span> <span class="wht">${c.description}</span>`;
        if (c.key === 'git log') {
          const aliases = Object.keys(this.catAliases).join(', ');
          return row + `<br><span class="dim">${''.padEnd(21)}• </span><span class="yel">cat &lt;${aliases}&gt;</span><span class="dim"> → full details for a work experience</span>`;
        }
        return row;
      });
    return `<div class="t-out">
      <span class="grn">available commands:</span><br><br>
      ${lines.join("<br>")}
      <br><br><span class="dim">tip: click the shortcuts below to run commands instantly.</span>
      </div>`;
  }

/**
 * Returns a string containing information about the user.
 * @returns a string containing the user's name, role, years of experience, location, status, and stack
 */
  private cmdWhoami(): string {
    if (!this.profile) return this.errNoData();
    const p = this.profile;
    const stackPills = p.profileStacks
      .map(s => `<span class="pill pm">${this.esc(s.name)}</span>`)
      .join('');
    return `<div class="t-box">
      <div class="t-row"><span class="t-k">name</span><span class="wht">${this.esc(p.name)}</span></div>
      <div class="t-row"><span class="t-k">role</span><span class="grn">${this.esc(p.role)}</span></div>
      <div class="t-row"><span class="t-k">experience</span><span class="wht">${this.esc(p.yearsOfExperience)}</span></div>
      <div class="t-row"><span class="t-k">location</span><span class="wht">${this.esc(p.location)}</span></div>
      <div class="t-row"><span class="t-k">status</span><span class="yel">${this.esc(p.status.name)}</span></div>
      <div class="t-row"><span class="t-k">stack</span><span style="display:flex;flex-wrap:wrap;gap:3px">${stackPills}</span></div>
      </div>`;
  }

/**
 * Returns a string containing a list of all projects the user has worked on.
 * Each project is represented as a row in a table, with columns for the project name, stack, impact, and status.
 * The projects are sorted by impact (highest to lowest).
 * @returns a string containing the list of all projects
 */
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

  /**
   * Returns a string containing a list of all skills the user has, grouped by category.
   * Each category is represented as a section with a header and a list of skills.
   * The skills are represented as pills, with colors indicating the proficiency level.
   * @returns a string containing the list of all skills
   */
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

  /**
   * Returns a string containing a list of all work experiences, in a format similar to a git log.
   * Each work experience is represented as a row, with the id, role, company, duration, and type.
   * The tip at the end of the output suggests using the "cat <id>" command to read full details for a work experience.
   * @returns a string containing the list of all work experiences
   */
  private cmdGitLog(): string {
    if (!this.experience.length) return this.errNoData();
    const lines = this.experience
      .map((e) => {
        const hash = String(e.id).padStart(7, "0");
        const isCurrent = e.duration.toLowerCase().includes("present");
        return `<div class="t-log-row">
        <span class="dim">* </span><span class="yel">${hash}</span>
        ${isCurrent ? '<span class="wht">(HEAD → main)</span>' : ""}
        <span class="grn">feat:</span>
        <span class="wht">${this.esc(e.role)} @ ${this.esc(e.company)} · ${this.esc(e.duration)}</span>
        <span class="dim"> [${this.esc(e.type)}]</span>
        </div>`;
      })
      .join("");
    const idHint = this.experience.map((e) => e.id).join(" | ");
    return `<div class="t-out" style="margin-bottom:6px">${lines}
    <br><span class="dim">tip: </span><span class="wht">cat &lt;${idHint}&gt;</span><span class="dim"> to read full details</span>
    </div>`;
  }

/**
 * Fetches the full details of a work experience by id.
 * If the id is invalid, prints an error message with available ids.
 * If the id is valid, prints the full details of the work experience.
 * The full details include role, company, location, duration, type, and stack used.
 * @param id the id of the work experience to fetch
 */
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

/**
 * Returns a string containing a list of all education backgrounds the user has, in a format similar to a table.
 * Each education background is represented as a row, with the degree, field of study, institution, and period.
 * @returns a string containing the list of all education backgrounds
 */
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

  /**
   * Returns a string containing contact information for the user.
   * The contact information includes an email address, a github profile, and a linkedin profile.
   * @returns a string containing the contact information
   */
  private cmdContact(): string {
    if (!this.profile) return this.errNoData();
    const p = this.profile;
    return `<div class="t-out">
    <span class="grn">200 OK</span> · drop a message, she will get back to you.<br>
    <span class="dim">→ email   :</span> <span class="blu">${this.esc(p.email)}</span><br>
    <span class="dim">→ github  :</span> <a class="blu" href="${this.esc(p.github)}" target="_blank" rel="noopener noreferrer">${this.esc(p.github)}</a><br>
    <span class="dim">→ linkedin:</span> <a class="blu" href="${this.esc(p.linkedin)}" target="_blank" rel="noopener noreferrer">${this.esc(p.linkedin)}</a><br>
    </div>`;
        // <span class="dim">→ phone   :</span> <span class="wht">${this.esc(p.phoneNo)}</span><br>
  }

  /**
   * Opens the user's resume in a new tab.
   * If the resume is not found, prints an error message.
   * If the resume is found, opens it in a new tab and prints a success message.
   */
  private cmdResume(): void {
    const pdfPath = 'assets/Dayana Athira - Backend Software Engineer.pdf';
    this.pushOutput(`<span class="t-loading">opening resume</span>`);
    fetch(pdfPath)
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Dayana Athira - Backend Software Engineer.pdf';
        a.click();
        URL.revokeObjectURL(url);
        this.replaceLastOutput(
          `<span class="grn">✓ resume opened</span><span class="dim"> · check your downloads or the new tab.</span>`
        );
      })
      .catch(() => {
        this.replaceLastOutput(
          `<span class="red">error:</span> <span class="dim">could not load resume. please try again later.</span>`
        );
      });
  }

  private esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private errNoData(): string {
    return `<span class="red">error:</span> <span class="dim">data not available. check API connection.</span>`;
  }

  private pushInput(cmd: string) {
    this.lines.update((l) => [...l, { type: "input", content: cmd }]);
  }

  private pushOutput(html: string) {
    this.lines.update((l) => [...l, { type: "output", content: html, html: true }]);
    this.scrollTick.update((n) => n + 1);
  }

  /**
   * Replaces the last output message with a new one.
   * If no output message is found, does nothing.
   * @param html the new output message to replace the last one with
   */
  private replaceLastOutput(html: string) {
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
