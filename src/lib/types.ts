

export type Registration = {
  id: string;
  name: string;
  iitpNo: string;
  mobile: string;
  organization: string;
  submissionTime: string; // ISO 8601 string format
};

export type SuperAdmin = {
    id: string;
    name: string;
    mobile: string;
    username: string;
    password?: string;
    canManageAdmins: boolean;
    createdAt: string; // ISO 8601 string format
    isPrimary?: boolean;
    createdBy?: string; // ID of the admin who created this admin
};

export type Trainer = {
    id: string;
    name: string;
    mobile: string;
    meetingLink: string;
    username: string;
    password?: string;
    createdAt: string; // ISO 8601 string format
};

export type Batch = {
  id: string;
  name: string;
  course: 'Diploma' | 'Advance Diploma' | 'Other';
  startDate: string; // ISO 8601 string format
  startTime: string; // e.g., "10:00" (24-hour format)
  endTime: string; // e.g., "13:00" (24-hour format)
  meetingLink: string; // This will now be derived from the trainer
  trainerId?: string; // Link to the trainer
  registrations: Registration[];
  createdAt: string; // ISO 8601 string format
};

// This type is no longer used, but kept for potential future global settings.
export type MeetingLinks = {
  diplomaZoomLink: string;
  advanceDiplomaZoomLink: string;
};

export type Participant = {
    id: string;
    name: string;
    iitpNo: string;
    mobile: string;
    organization: string;
    createdAt: string; // ISO 8601 string format
    enrolledCourses?: string[];
    completedLessons?: string[];
    deniedCourses?: string[]; // Array of course IDs
}

export type Lesson = {
  id: string;
  title: string;
  videoUrl: string;
  description?: string;
  documentUrl?: string;
  duration?: number; // Duration in minutes
}

export type Unit = {
  id: string;
  title: string;
  lessons: Lesson[];
}

export type Subject = {
  id: string;
  name: string;
  units: Unit[];
};

export type Course = {
  id: string;
  name: string;
  subjects: Subject[];
  status?: 'active' | 'coming-soon' | 'deactivated';
};

export type Organization = {
    id: string;
    name: string;
    createdAt: string;
};

export type OrganizationAdmin = {
    id: string;
    name: string;
    organizationName: string;
    username: string;
    password?: string;
    createdAt: string;
};
    