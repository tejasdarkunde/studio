import type { Timestamp } from "firebase/firestore";

export type Registration = {
  id: string;
  name: string;
  iitpNo: string;
  organization: string;
  submissionTime: Date | Timestamp;
};

export type Batch = {
  id: string;
  name: string;
  createdAt: Date | Timestamp;
  registrations: Registration[];
  active: boolean;
};
