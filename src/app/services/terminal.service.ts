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
    { key: "cat <id>", description: "full details for an experience entry" },
    { key: "education", description: "academic background" },
    { key: "contact", description: "get in touch", aliases: ["curl contact"] },
    { key: "clear", description: "clear terminal" },
  ];

  constructor(private api: ApiService) {
    this.loadData();
  }

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

  private dispatch(raw: string): void {
    const cmd = raw.trim().toLowerCase();
    this.pushInput(raw.trim());
    const catMatch = cmd.match(/^cat\s+(\S+)$/);
    if (catMatch && catMatch[1] !== "stack") {
      this.cmdCat(parseInt(catMatch[1], 10));
      return;
    }
    this.pushOutput(this.resolve(cmd));
  }

  private resolve(cmd: string): string {
    if (cmd === "help") return this.cmdHelp();
    if (cmd === "whoami") return this.cmdWhoami();
    if (cmd === "ls projects" || cmd === "ls") return this.cmdProjects();
    if (cmd === "ls stack" || cmd === "cat stack") return this.cmdStack();
    if (cmd === "git log" || cmd === "git log --oneline")
      return this.cmdGitLog();
    if (cmd === "education") return this.cmdEducation();
    if (cmd === "contact" || cmd === "curl contact") return this.cmdContact();
    return `<span class="red">command not found:</span> <span class="wht">${cmd}</span><span class="dim"> — type </span><span class="grn">help</span><span class="dim"> for commands.</span>`;
  }

  private cmdHelp(): string {
    return `<div class="t-out">
      <span class="grn">available commands:</span><br><br>
      ${this.COMMANDS.map(
        (c) =>
          `<span class="yel">${c.key.padEnd(18)}</span><span class="dim">→</span> <span class="wht">${c.description}</span>`,
      ).join("<br>")}
      <br><br><span class="dim">tip: click the shortcuts below to run commands instantly.</span>
      </div>`;
  }

  private cmdWhoami(): string {
    if (!this.profile) return this.errNoData();
    const p = this.profile;
    return `<div class="t-box">
      <div class="t-row"><span class="t-k">name</span><span class="wht">${p.name}</span></div>
      <div class="t-row"><span class="t-k">role</span><span class="grn">${p.role}</span></div>
      <div class="t-row"><span class="t-k">stack</span><span class="wht">${p.stack.map((s) => s.name).join(" · ")}</span></div>
      <div class="t-row"><span class="t-k">location</span><span class="wht">${p.location}</span></div>
      <div class="t-row"><span class="t-k">experience</span><span class="wht">${p.experience}</span></div>
      <div class="t-row"><span class="t-k">email</span><span class="blu">${p.email}</span></div>
      <div class="t-row"><span class="t-k">phone</span><span class="wht">${p.phoneNo}</span></div>
      <div class="t-row"><span class="t-k">status</span><span class="yel">${p.status.name}</span></div>
      </div>`;
  }

  private cmdProjects(): string {
    if (!this.projects.length) return this.errNoData();
    const rows = this.projects
      .map(
        (p, i) => `
      <tr>
        <td class="grn">${String(i + 1).padStart(3, "0")} ${p.name}/</td>
        <td>${p.stack
          .slice(0, 3)
          .map((s) => `<span class="pill pm">${s.name}</span>`)
          .join("")}</td>
        <td class="yel">${p.impact}</td>
        <td class="grn">${p.status.name}</td>
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
            return `<span class="pill pm"><span class="${cls}">${s.name}</span></span>`;
          })
          .join("");
        return `<div class="t-section-hdr">// ${category.toLowerCase()}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${pills}</div>`;
      })
      .join("");
    return `<div class="t-out" style="margin-bottom:8px"><span class="grn">skills · by category</span></div>${sections}`;
  }

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
        <span class="wht">${e.role} @ ${e.company} · ${e.duration}</span>
        <span class="dim"> [${e.type}]</span>
        </div>`;
      })
      .join("");
    const idHint = this.experience.map((e) => e.id).join(" | ");
    return `<div class="t-out" style="margin-bottom:6px">${lines}
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
        <div class="t-section-hdr">// ${title.toLowerCase()}</div>
        ${bullets.map((b) => `<div class="t-bullet"><span class="grn t-bullet-dot">▸</span><span>${b}</span></div>`).join("")}
        `,
          )
          .join("");
        const stackPills = d.stack
          .map((s) => `<span class="pill pm">${s.name}</span>`)
          .join("");
        this.replaceLastOutput(`<div class="t-box">
        <div class="t-row"><span class="t-k">role</span><span class="grn">${d.role}</span></div>
        <div class="t-row"><span class="t-k">company</span><span class="wht">${d.company}</span></div>
        <div class="t-row"><span class="t-k">location</span><span class="wht">${d.location}</span></div>
        <div class="t-row"><span class="t-k">duration</span><span class="yel">${d.duration}</span></div>
        <div class="t-row"><span class="t-k">type</span><span class="dim">${d.type}</span></div>
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
        <div class="t-row"><span class="t-k">degree</span><span class="grn">${e.degree}</span></div>
        <div class="t-row"><span class="t-k">field</span><span class="wht">${e.fieldOfStudy}</span></div>
        <div class="t-row"><span class="t-k">institution</span><span class="wht">${e.name}</span></div>
        <div class="t-row"><span class="t-k">period</span><span class="yel">${e.startDate} – ${e.endDate}</span></div>
        </div>`,
      )
      .join("");
  }

  private cmdContact(): string {
    if (!this.profile) return this.errNoData();
    const p = this.profile;
    return `<div class="t-out">
    <span class="grn">200 OK</span> · drop a message, she will get back to you.<br>
    <span class="dim">→ email   :</span> <span class="blu">${p.email}</span><br>
    <span class="dim">→ github   :</span> <span class="blu">${p.github}</span><br>
    <span class="dim">→ linkedIn   :</span> <span class="blu">${p.linkedin}</span><br>
    <span class="dim">→ phone   :</span> <span class="wht">${p.phoneNo}</span><br>
    </div>`;
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
