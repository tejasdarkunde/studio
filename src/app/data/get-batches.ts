
"use server";

import { db } from "@/lib/firebase";
import type { Registration, Batch } from "@/lib/types";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";

/**
 * Fetches all batches and their registrations from Firestore.
 * Ensures all Timestamp objects are converted to ISO strings before returning.
 * @returns A promise that resolves to an array of Batch objects.
 */
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
                    // Ensure submissionTime is a string
                    return {
                        id: regDoc.id,
                        name: data.name,
                        iitpNo: data.iitpNo,
                        organization: data.organization,
                        submissionTime: submissionTime?.toDate().toISOString() || new Date().toISOString(),
                    } as Registration;
                });

                const batchData = batchDoc.data();
                const createdAt = batchData.createdAt as Timestamp;
                // Ensure createdAt is a string
                return {
                    id: batchDoc.id,
                    name: batchData.name,
                    createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                    registrations,
                    active: batchData.active,
                };
            })
        );
        
        // Sort batches by creation date, most recent first.
        return batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (error) {
        console.error("Error fetching batches:", error);
        // Return an empty array in case of an error to prevent crashes.
        return [];
    }
}
