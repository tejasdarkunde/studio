"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, writeBatch, getDoc } from "firebase/firestore";
import type { Registration, Batch } from "@/lib/types";

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

    const newRegistration: Omit<Registration, 'id' | 'submissionTime'> & { submissionTime: any } = {
      ...validatedFields.data,
      submissionTime: serverTimestamp(),
    };
    
    const registrationsCollection = collection(db, `batches/${activeBatchId}/registrations`);
    const docRef = await addDoc(registrationsCollection, newRegistration);

    const finalRegistration: Registration = {
        id: docRef.id,
        ...validatedFields.data,
        submissionTime: new Date(), 
    };

    return { success: true, registration: finalRegistration };
  } catch (error) {
    console.error("Error creating registration:", error);
    return { success: false, error: "Failed to register. Please try again." };
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
                const registrations: Registration[] = regSnapshot.docs.map(regDoc => ({
                    id: regDoc.id,
                    ...regDoc.data(),
                    submissionTime: (regDoc.data().submissionTime as any).toDate(),
                } as Registration));

                return {
                    id: batchDoc.id,
                    ...batchDoc.data(),
                    createdAt: (batchDoc.data().createdAt as any).toDate(),
                    registrations,
                } as Batch;
            })
        );
        return batches;
    } catch (error) {
        console.error("Error fetching batches:", error);
        return [];
    }
}

export async function startNewBatch(): Promise<{success: boolean, newBatch?: Batch, error?: string}> {
    try {
        const batch = writeBatch(db);
        const batchesCollection = collection(db, "batches");
        
        // Deactivate all other batches
        const q = query(batchesCollection, where("active", "==", true));
        const activeDocs = await getDocs(q);
        activeDocs.forEach(doc => {
            batch.update(doc.ref, { active: false });
        });

        // Create new batch
        const newBatchId = doc(collection(db, "batches")).id;
        const newBatchData = {
            name: `Event Batch ${activeDocs.size + 1}`,
            createdAt: serverTimestamp(),
            active: true,
        };
        batch.set(doc(batchesCollection, newBatchId), newBatchData);
        
        await batch.commit();

        const newBatchDoc = await getDoc(doc(batchesCollection, newBatchId));
        if (newBatchDoc.exists()) {
             return {
                success: true,
                newBatch: {
                    id: newBatchDoc.id,
                    ...newBatchDoc.data(),
                    createdAt: new Date(),
                    registrations: [],
                } as Batch,
            };
        }
        return { success: false, error: "Failed to retrieve new batch." };
    } catch(error) {
        console.error("Error starting new batch:", error);
        return {success: false, error: "Could not start new batch."}
    }
}

export async function updateBatchName(batchId: string, newName: string): Promise<{success: boolean, error?: string}> {
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        await updateDoc(batchDocRef, { name: newName });
        return { success: true };
    } catch(error) {
        console.error("Error updating batch name:", error);
        return { success: false, error: "Could not update batch name." };
    }
}
