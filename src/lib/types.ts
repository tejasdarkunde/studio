
export type Registration = {
  id: string;
  name: string;
  iitpNo: string;
  mobile: string;
  organization: string;
  submissionTime: string; // ISO 8601 string format
};

export type Batch = {
  id: string; // Will be 'diploma' or 'advance-diploma'
  name: string;
  createdAt: string; // ISO 8601 string format
  registrations: Registration[];
  active: boolean; // This can be used to enable/disable a program
};

export type MeetingLinks = {
  diplomaZoomLink: string;
  advanceDiplomaZoomLink: string;
};
