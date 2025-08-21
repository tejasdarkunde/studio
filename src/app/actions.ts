
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc, addDoc } from "firebase/firestore";
import type { Registration, Batch, MeetingLinks } from "@/lib/types";

const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  mobile: z.string().min(10, { message: "A valid mobile number is required." }),
  organization: z.string({
    required_error: "Please select an organization.",
  }),
  batchId: z.enum(['diploma', 'advance-diploma']),
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

    // Ensure the batch document exists
    const batchDocRef = doc(db, "batches", batchId);
    const batchDoc = await getDoc(batchDocRef);

    if (!batchDoc.exists()) {
        const batchName = batchId === 'diploma' ? 'Diploma Program' : 'Advance Diploma Program';
        await setDoc(batchDocRef, {
            name: batchName,
            createdAt: serverTimestamp(),
            active: true,
        });
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
        const batchIds = ['diploma', 'advance-diploma'];
        const batches: Batch[] = [];

        for (const batchId of batchIds) {
            const batchDocRef = doc(db, "batches", batchId);
            const batchDoc = await getDoc(batchDocRef);

            let batchData: any;
            let createdAt: Timestamp;

            if (batchDoc.exists()) {
                batchData = batchDoc.data();
                createdAt = batchData.createdAt as Timestamp;
            } else {
                // Create the batch if it doesn't exist
                const batchName = batchId === 'diploma' ? 'Diploma Program' : 'Advance Diploma Program';
                const newBatchData = {
                    name: batchName,
                    createdAt: serverTimestamp(),
                    active: true,
                };
                await setDoc(batchDocRef, newBatchData);
                // We'll just use now for created at on the client
                createdAt = Timestamp.now();
                batchData = { name: batchName, active: true };
            }
            
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
                name: batchData.name,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                registrations,
                active: batchData.active,
            });
        }
        
        return batches;

    } catch (error) {
        console.error("Error fetching batches:", error);
        return [];
    }
}

export async function updateBatchName(batchId: string, newName: string): Promise<{success: boolean, error?: string}> {
    if (!newName.trim()) {
        return { success: false, error: "Batch name cannot be empty." };
    }
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        await setDoc(batchDocRef, { name: newName }, { merge: true });
        return { success: true };
    } catch(error) {
        console.error("Error updating batch name:", error);
        return { success: false, error: "Could not update batch name." };
    }
}

export async function getMeetingLinks(): Promise<MeetingLinks> {
    try {
        const settingsDocRef = doc(db, 'settings', 'meetingLinks');
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            return docSnap.data() as MeetingLinks;
        } else {
            // Return default empty values if the document doesn't exist
            return { diplomaZoomLink: '', advanceDiplomaZoomLink: '' };
        }
    } catch (error) {
        console.error("Error fetching meeting links:", error);
        return { diplomaZoomLink: '', advanceDiplomaZoomLink: '' };
    }
}

export async function saveMeetingLinks(links: MeetingLinks): Promise<{success: boolean, error?: string}> {
    try {
        const settingsDocRef = doc(db, 'settings', 'meetingLinks');
        await setDoc(settingsDocRef, links, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving meeting links:", error);
        return { success: false, error: "Could not save links to the database." };
    }
}

export async function getRedirectLink(batchId: 'diploma' | 'advance-diploma'): Promise<{link: string | null, linkName: string}> {
    const links = await getMeetingLinks();
    
    if (batchId === 'diploma') {
        return { link: links.diplomaZoomLink, linkName: "Diploma Zoom Link" };
    } else {
        return { link: links.advanceDiplomaZoomLink, linkName: "Advance Diploma Zoom Link" };
    }
}
