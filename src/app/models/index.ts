export interface ApiResponse<T> {
  statusCode: number;
  data: T;
}

export interface IdName {
  id: number;
  name: string;
}

export interface Profile {
  userId: string;
  name: string;
  email: string;
  phoneNo: string;
  github: string;
  linkedin: string;
  location: string;
  stack: IdName[];
  role: string;
  experience: string;
  status: IdName;
}



export interface Project {
  id: number;
  userId: string;
  name: string;
  stack: IdName[];
  description: string;
  impact: string;
  status: IdName;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  profiency: string;
}

export interface Education {
  id: number;
  name: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
}

export interface ExperienceEntry {
  id: number;
  company: string;
  role: string;
  location: string;
  duration: string;
  type: string;
}

export interface ExperienceDetailItem {
  id: number;
  name: string;
  description: string;
}

export interface ExperienceDetail {
  company: string;
  role: string;
  location: string;
  duration: string;
  type: string;
  details: ExperienceDetailItem[];
  stack: IdName[];
}

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface TerminalLine {
  type: 'input' | 'output';
  content: string;
  html?: boolean;
}

export interface Command {
  key: string;
  description: string;
  aliases?: string[];
}
