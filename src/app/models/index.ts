export interface ApiResponse<T> {
  statusCode: number;
  data: T;
}

export interface IdName {
  id: number;
  name: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  profiency: string;
}

export interface Profile {
  userId: string;
  name: string;
  email: string;
  github: string;
  linkedin: string;
  phoneNo: string;
  location: string;
  profileStacks: Skill[];
  role: string;
  yearsOfExperience: string;
  status: IdName;
}



export interface Project {
  id: number;
  name: string;
  projectStacks: Skill[];
  description: string;
  impact: string;
  status: IdName;
}

export interface Education {
  id: number;
  name: string;
  degree: string;
  fieldOfStudy: string;
  startDate: number;
  endDate: number;
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
  id: number;
  company: string;
  role: string;
  location: string;
  duration: string;
  type: string;
  details: ExperienceDetailItem[];
  experienceStack: Skill[];
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
