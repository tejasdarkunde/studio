

export type Registration = {
  id: string;
  name: string;
  iitpNo: string;
  mobile: string;
  organization: string;
  submissionTime: string; // ISO 8601 string format
};

export type Batch = {
  id: string;
  name: string;
  startDate: string; // ISO 8601 string format
  startTime: string; // e.g., "10:00" (24-hour format)
  endTime: string; // e.g., "13:00" (24-hour format)
  meetingLink: string;
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
}
