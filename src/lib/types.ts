export type Registration = {
  name: string;
  iitpNo: string;
  organization: string;
  submissionTime: Date;
};

export type Batch = {
  id: number;
  name: string;
  createdAt: Date;
  registrations: Registration[];
};
