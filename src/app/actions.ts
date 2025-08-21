
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc, addDoc, orderBy, deleteDoc, updateDoc, where } from "firebase/firestore";
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

        const participants = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: doc.id,
                name: data.name,
                iitpNo: data.iitpNo,
                mobile: data.mobile,
                organization: data.organization,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                enrolledCourses: data.enrolledCourses || [], 
            };
        });

        return participants;

    } catch (error) {
        console.error("Error fetching participants with courses:", error);
        return [];
    }
}

const participantSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  mobile: z.string().optional(),
  organization: z.string().optional(),
  enrolledCourses: z.array(z.string()).optional(),
});


export async function addParticipant(data: z.infer<typeof participantSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = participantSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid form data." };
    }
    
    try {
        const { iitpNo } = validatedFields.data;
        const participantsCollection = collection(db, "participants");

        // Check for duplicates
        const duplicateQuery = query(participantsCollection, where("iitpNo", "==", iitpNo));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if (!duplicateSnapshot.empty) {
            return { success: false, error: "A participant with this IITP No. already exists." };
        }

        await addDoc(participantsCollection, {
            ...validatedFields.data,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding participant:", error);
        return { success: false, error: "Could not add participant due to a database error." };
    }
}

const participantUpdateSchema = participantSchema.extend({
  id: z.string().min(1),
});

export async function updateParticipant(data: z.infer<typeof participantUpdateSchema>): Promise<{ success: boolean; error?: string }> {
  const { id, ...participantData } = data;
  const validatedFields = participantSchema.safeParse(participantData);

  if (!validatedFields.success) {
    return { success: false, error: "Invalid participant data." };
  }

  try {
    const participantDocRef = doc(db, 'participants', id);
    // You might want to check for duplicate IITP No here as well, if it's being changed.
    // For simplicity, we'll assume IITP No is unique and can be changed.
    // A more robust solution would query for other docs with the new IITP No, excluding the current doc.
    await updateDoc(participantDocRef, validatedFields.data);
    return { success: true };
  } catch (error) {
    console.error("Error updating participant:", error);
    return { success: false, error: "Could not update participant." };
  }
}


export async function addParticipantsInBulk(participants: Omit<Participant, 'id' | 'createdAt'>[]): Promise<{ success: boolean; error?: string, skippedCount?: number }> {
    const participantsCollection = collection(db, "participants");
    
    try {
        // Fetch all existing IITP Nos for an efficient in-memory check
        const existingDocsSnapshot = await getDocs(query(participantsCollection, select("iitpNo")));
        const existingIitpNos = new Set(existingDocsSnapshot.docs.map(doc => doc.data().iitpNo));
        
        const batch = writeBatch(db);
        const iitpNosInCurrentUpload = new Set<string>();
        let skippedCount = 0;

        for (const participant of participants) {
            const validatedFields = participantSchema.safeParse(participant);
            if (!validatedFields.success) {
                // Skip invalid records from CSV
                skippedCount++;
                continue;
            }
            
            const { iitpNo } = validatedFields.data;

            // Check for duplicates in DB and in the current upload file
            if (existingIitpNos.has(iitpNo) || iitpNosInCurrentUpload.has(iitpNo)) {
                skippedCount++;
                continue;
            }

            const newDocRef = doc(participantsCollection);
            batch.set(newDocRef, {
                ...validatedFields.data,
                createdAt: serverTimestamp(),
            });
            iitpNosInCurrentUpload.add(iitpNo);
        }

        await batch.commit();
        
        if (skippedCount > 0) {
            return { success: true, error: `${skippedCount} participant(s) were skipped due to invalid data or duplicate IITP Nos.`, skippedCount };
        }

        return { success: true };

    } catch (error) {
        console.error("Error adding participants in bulk:", error);
        return { success: false, error: "Could not add participants due to a database error." };
    }
}
// Helper for addParticipantsInBulk to get just the iitpNo field
const select = (...fields: string[]) => {
    // This is a placeholder. In a real application, you might use a library
    // or a more complex query builder. For Firestore (client/admin), there's no direct `select`
    // on the query itself, you get the whole doc. This function signature is for clarity.
    // The logic in addParticipantsInBulk handles getting the full docs and mapping to the field.
    return query(collection(db, "participants"));
};

    