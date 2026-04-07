import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
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
    return this.http.post(`${this.base}/contact`, payload);
  }
}
