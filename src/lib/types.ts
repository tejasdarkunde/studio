
export type Registration = {
  id: string;
  name: string;
  iitpNo: string;
  organization: string;
  submissionTime: string; // ISO 8601 string format
};

export type Batch = {
  id: string;
  name: string;
  createdAt: string; // ISO 8601 string format
  registrations: Registration[];
  active: boolean;
};
