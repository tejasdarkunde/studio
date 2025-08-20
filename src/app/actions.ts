
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc } from "firebase/firestore";
import type { Registration, Batch, MeetingLinks } from "@/lib/types";

const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  organization: z.string({
    required_error: "Please select an organization.",
  }),
});

export async function registerForMeeting(
  data: z.infer<typeof registrationSchema>
): Promise<{ success: true; registration: Registration } | { success: false; error: string }> {
  const validatedFields = registrationSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, error: "Invalid form data." };
  }
  
  try {
    const batchesCollection = collection(db, "batches");
    const q = query(batchesCollection, where("active", "==", true));
    const querySnapshot = await getDocs(q);
    
    let activeBatchId: string;

    if (querySnapshot.empty) {
      // If no active batch, create a new one
      const newBatchDoc = await addDoc(batchesCollection, {
        name: "Event Batch 1",
        createdAt: serverTimestamp(),
        active: true,
      });
      activeBatchId = newBatchDoc.id;
    } else {
      // Use the existing active batch
      activeBatchId = querySnapshot.docs[0].id;
    }

    const newRegistrationData = {
      ...validatedFields.data,
      submissionTime: serverTimestamp(),
    };
    
    const registrationsCollection = collection(db, `batches/${activeBatchId}/registrations`);
    const docRef = await addDoc(registrationsCollection, newRegistrationData);

    const finalRegistration: Registration = {
        id: docRef.id,
        ...validatedFields.data,
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
        const batchesCollection = collection(db, "batches");
        const batchSnapshot = await getDocs(batchesCollection);
        const batches = await Promise.all(
            batchSnapshot.docs.map(async (batchDoc) => {
                const registrationsCollection = collection(db, `batches/${batchDoc.id}/registrations`);
                const regSnapshot = await getDocs(registrationsCollection);
                const registrations: Registration[] = regSnapshot.docs.map(regDoc => {
                    const data = regDoc.data();
                    const submissionTime = data.submissionTime as Timestamp;
                    return {
                        id: regDoc.id,
                        name: data.name,
                        iitpNo: data.iitpNo,
                        organization: data.organization,
                        submissionTime: submissionTime?.toDate().toISOString() || new Date().toISOString(),
                    };
                });

                const batchData = batchDoc.data();
                const createdAt = batchData.createdAt as Timestamp;
                return {
                    id: batchDoc.id,
                    name: batchData.name,
                    createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                    registrations,
                    active: batchData.active,
                };
            })
        );
        return batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error("Error fetching batches:", error);
        return [];
    }
}

export async function startNewBatch(): Promise<{success: boolean, newBatch?: Batch, error?: string}> {
    try {
        const batchesCollection = collection(db, "batches");
        
        // Deactivate all other batches in a transaction
        const activeQuery = query(batchesCollection, where("active", "==", true));
        const activeDocs = await getDocs(activeQuery);
        
        const batch = writeBatch(db);
        activeDocs.forEach(docToDeactivate => {
            batch.update(doc(db, "batches", docToDeactivate.id), { active: false });
        });
        await batch.commit();
        
        const batchCountSnapshot = await getDocs(collection(db, "batches"));
        const newBatchNumber = batchCountSnapshot.size + 1;

        // Create new batch
        const newBatchData = {
            name: `Event Batch ${newBatchNumber}`,
            createdAt: serverTimestamp(),
            active: true,
        };

        const newBatchRef = await addDoc(batchesCollection, newBatchData);
        const newBatchSnapshot = await getDoc(newBatchRef);
        const createdBatch = newBatchSnapshot.data();

        if (!createdBatch) {
            throw new Error("Failed to retrieve the new batch after creation.");
        }
        
        const createdAt = createdBatch.createdAt as Timestamp;

        return {
          success: true,
          newBatch: {
            id: newBatchRef.id,
            name: createdBatch.name,
            createdAt: createdAt.toDate().toISOString(),
            active: createdBatch.active,
            registrations: [],
          },
        };

    } catch(error) {
        console.error("Error starting new batch:", error);
        return {success: false, error: "Could not start new batch. Check Firestore rules."}
    }
}

export async function updateBatchName(batchId: string, newName: string): Promise<{success: boolean, error?: string}> {
    if (!newName.trim()) {
        return { success: false, error: "Batch name cannot be empty." };
    }
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        await updateDoc(batchDocRef, { name: newName });
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

export async function getRedirectLink(organization: string): Promise<{link: string | null, linkName: string}> {
    const links = await getMeetingLinks();
    
    // Diploma organizations
    const diplomaOrgs = [
        "TE Connectivity, Shirwal",
        "BSA Plant, Chakan",
        "Belden India",
    ];

    if (diplomaOrgs.includes(organization)) {
        return { link: links.diplomaZoomLink, linkName: "Diploma Zoom Link" };
    } else {
        // All other organizations, including "Other", will use the Advance Diploma link
        return { link: links.advanceDiplomaZoomLink, linkName: "Advance Diploma Zoom Link" };
    }
}
