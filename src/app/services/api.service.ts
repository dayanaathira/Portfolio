import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../environments/environment";
import {
  ApiResponse,
  Profile,
  Project,
  Skill,
  ExperienceEntry,
  ExperienceDetail,
  Education,
  ContactPayload,
} from "../models";

@Injectable({ providedIn: "root" })
export class ApiService {
  private base = environment.apiUrl;
  private userId = "uu-id-123-dasd343534-sfsda-dsad";

  constructor(private http: HttpClient) {}

  getProfile(): Observable<Profile> {
    return this.http
      .get<ApiResponse<Profile>>(`${this.base}/profile/${this.userId}`)
      .pipe(map((r) => r.data));
  }

  getProjects(): Observable<Project[]> {
    return this.http
      .get<ApiResponse<Project[]>>(`${this.base}/projects/${this.userId}`)
      .pipe(map((r) => r.data));
  }

  getStack(): Observable<Skill[]> {
    return this.http
      .get<ApiResponse<Skill[]>>(`${this.base}/projects/stack/${this.userId}`)
      .pipe(map((r) => r.data));
  }

  getExperience(): Observable<ExperienceEntry[]> {
    return this.http
      .get<ApiResponse<ExperienceEntry[]>>(`${this.base}/experiences/${this.userId}`)
      .pipe(map((r) => r.data));
  }

  getExperienceBySlug(experienceId: number): Observable<ExperienceDetail> {
    return this.http
      .get<ApiResponse<ExperienceDetail>>(`${this.base}/experiences/${experienceId}/${this.userId}`)
      .pipe(map((r) => r.data));
  }

  getEducation(): Observable<Education[]> {
    return this.http
      .get<
        ApiResponse<Education[]>
      >(`${this.base}/profile/education/${this.userId}`)
      .pipe(map((r) => r.data));
  }

  sendContact(payload: ContactPayload): Observable<any> {
    const errors = this.validateContact(payload);
    if (errors.length) return throwError(() => new Error(errors.join(', ')));
    return this.http.post(`${this.base}/contact`, payload);
  }

  private validateContact(p: ContactPayload): string[] {
    const errors: string[] = [];
    if (!p.name || p.name.length < 2 || p.name.length > 100)
      errors.push('name must be 2–100 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
      errors.push('invalid email');
    if (!p.subject || p.subject.length < 3 || p.subject.length > 200)
      errors.push('subject must be 3–200 characters');
    if (!p.message || p.message.length < 10 || p.message.length > 5000)
      errors.push('message must be 10–5000 characters');
    return errors;
  }
}
