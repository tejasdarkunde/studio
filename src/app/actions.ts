
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc, addDoc, orderBy, deleteDoc } from "firebase/firestore";
import type { Registration, Batch, MeetingLinks, Participant } from "@/lib/types";

const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  mobile: z.string().min(10, { message: "A valid mobile number is required." }),
  organization: z.string({
    required_error: "Please select an organization.",
  }),
  batchId: z.string().min(1, { message: "Batch ID is required." }),
});

export async function registerForMeeting(
  data: z.infer<typeof registrationSchema>
): Promise<{ success: true; registration: Registration } | { success: false; error: string }> {
  const validatedFields = registrationSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, error: "Invalid form data." };
  }
  
  try {
    const { batchId, ...registrationData } = validatedFields.data;

    const batchDocRef = doc(db, "batches", batchId);
    const batchDoc = await getDoc(batchDocRef);

    if (!batchDoc.exists()) {
        return { success: false, error: "The event you are trying to register for does not exist." };
    }

    const newRegistrationData = {
      ...registrationData,
      submissionTime: serverTimestamp(),
    };
    
    const registrationsCollection = collection(db, `batches/${batchId}/registrations`);
    const docRef = await addDoc(registrationsCollection, newRegistrationData);

    const finalRegistration: Registration = {
        id: docRef.id,
        ...registrationData,
        submissionTime: new Date().toISOString(), 
    };

    return { success: true, registration: finalRegistration };
  } catch (error) {
    console.error("Error creating registration:", error);
    return { success: false, error: "Failed to register. Please check your Firestore security rules and configuration." };
  }
}

export async function getBatches(): Promise<Batch[]> {
    try {
        const batchesCollectionRef = collection(db, "batches");
        const q = query(batchesCollectionRef, orderBy("createdAt", "desc"));
        const allBatchesSnapshot = await getDocs(q);
        const batches: Batch[] = [];

        for (const batchDoc of allBatchesSnapshot.docs) {
            const batchId = batchDoc.id;
            const batchData = batchDoc.data();
            const createdAt = batchData.createdAt as Timestamp;
            
            // Backward compatibility for old data model
            const startDate = batchData.startDate as Timestamp | undefined;
            const endDate = batchData.endDate as Timestamp | undefined;

            const registrationsCollection = collection(db, `batches/${batchId}/registrations`);
            const regSnapshot = await getDocs(registrationsCollection);
            const registrations: Registration[] = regSnapshot.docs.map(regDoc => {
                const data = regDoc.data();
                const submissionTime = data.submissionTime as Timestamp;
                return {
                    id: regDoc.id,
                    name: data.name,
                    iitpNo: data.iitpNo,
                    mobile: data.mobile,
                    organization: data.organization,
                    submissionTime: submissionTime?.toDate().toISOString() || new Date().toISOString(),
                };
            });

            batches.push({
                id: batchId,
                name: batchData.name || 'Unnamed Batch',
                startDate: startDate?.toDate().toISOString() || '',
                startTime: batchData.startTime || '00:00',
                endTime: batchData.endTime || '00:00',
                meetingLink: batchData.meetingLink || '',
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                registrations,
            });
        }
        
        return batches;

    } catch (error) {
        console.error("Error fetching batches:", error);
        return [];
    }
}

export async function getBatchById(id: string): Promise<Batch | null> {
    try {
        const batchDocRef = doc(db, 'batches', id);
        const batchDoc = await getDoc(batchDocRef);

        if (!batchDoc.exists()) {
            return null;
        }

        const batchData = batchDoc.data();
        const createdAt = batchData.createdAt as Timestamp;
        const startDate = batchData.startDate as Timestamp;

        return {
            id: batchDoc.id,
            name: batchData.name || 'Unnamed Batch',
            startDate: startDate?.toDate().toISOString() || '',
            startTime: batchData.startTime || '00:00',
            endTime: batchData.endTime || '00:00',
            meetingLink: batchData.meetingLink || '',
            createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            registrations: [], 
        };
    } catch (error) {
        console.error('Error fetching batch by ID:', error);
        return null;
    }
}


export async function updateBatch(batchId: string, data: Partial<Pick<Batch, 'name' | 'meetingLink' | 'startDate' | 'startTime' | 'endTime'>>): Promise<{success: boolean, error?: string}> {
    if (!data.name || !data.name.trim()) {
        return { success: false, error: "Batch name cannot be empty." };
    }
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        
        const updateData: any = {
            name: data.name,
            meetingLink: data.meetingLink || '',
            startTime: data.startTime || '00:00',
            endTime: data.endTime || '00:00',
        };

        if(data.startDate) {
            updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
        }

        await setDoc(batchDocRef, updateData, { merge: true });
        return { success: true };
    } catch(error) {
        console.error("Error updating batch:", error);
        return { success: false, error: "Could not update batch." };
    }
}

const createBatchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  startDate: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  meetingLink: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

export async function createBatch(data: z.infer<typeof createBatchSchema>): Promise<{success: boolean, error?: string}> {
    const validatedFields = createBatchSchema.safeParse(data);
    if(!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid form data."};
    }

    try {
        const { name, startDate, startTime, endTime, meetingLink } = validatedFields.data;
        const batchesCollection = collection(db, "batches");
        await addDoc(batchesCollection, {
            name,
            startDate: Timestamp.fromDate(startDate),
            startTime,
            endTime,
            meetingLink: meetingLink || '',
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error creating batch:", error);
        return { success: false, error: "Could not create batch." };
    }
}


export async function getRedirectLink(batchId: string): Promise<{link: string | null}> {
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        const batchDoc = await getDoc(batchDocRef);

        if (batchDoc.exists()) {
            return { link: batchDoc.data().meetingLink || null };
        } else {
            return { link: null };
        }
    } catch(error) {
        return { link: null };
    }
}

export async function deleteBatch(batchId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        
        // Optional: Delete subcollections first if they are large
        const registrationsCollectionRef = collection(db, `batches/${batchId}/registrations`);
        const regSnapshot = await getDocs(registrationsCollectionRef);
        const deletePromises: Promise<void>[] = [];
        regSnapshot.forEach(doc => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
        
        // Delete the main batch document
        await deleteDoc(batchDocRef);
        
        return { success: true };

    } catch (error) {
        console.error("Error deleting batch:", error);
        return { success: false, error: "Could not delete the batch." };
    }
}

export async function getParticipants(): Promise<Participant[]> {
    try {
        const participantsCollectionRef = collection(db, "participants");
        const q = query(participantsCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: doc.id,
                name: data.name,
                iitpNo: data.iitpNo,
                mobile: data.mobile,
                organization: data.organization,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error("Error fetching participants:", error);
        return [];
    }
}

const participantSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  mobile: z.string().min(10, { message: "A valid 10-digit mobile number is required." }),
  organization: z.string().min(1, { message: "Organization is required." }),
});


export async function addParticipant(data: z.infer<typeof participantSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = participantSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid form data." };
    }

    try {
        const participantsCollection = collection(db, "participants");
        await addDoc(participantsCollection, {
            ...validatedFields.data,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding participant:", error);
        return { success: false, error: "Could not add participant." };
    }
}


export async function addParticipantsInBulk(participants: Omit<Participant, 'id' | 'createdAt'>[]): Promise<{ success: boolean; error?: string }> {
  const batch = writeBatch(db);
  const participantsCollection = collection(db, "participants");

  for (const participant of participants) {
    const validatedFields = participantSchema.safeParse(participant);
    if (!validatedFields.success) {
      console.error("Invalid participant data in bulk upload:", validatedFields.error.flatten().fieldErrors);
      // Skip invalid records
      continue;
    }
    
    const newDocRef = doc(participantsCollection);
    batch.set(newDocRef, {
      ...validatedFields.data,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error adding participants in bulk:", error);
    return { success: false, error: "Could not add participants due to a database error." };
  }
}
