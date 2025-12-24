

"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc, addDoc, orderBy, deleteDoc, updateDoc, where, arrayUnion, arrayRemove, limit } from "firebase/firestore";
import type { Registration, Batch, MeetingLinks, Participant, Trainer, Course, Subject, Unit, Lesson, SuperAdmin, Organization, Supervisor, Exam, Question, ExamAttempt, ExamResult, FormAdmin, Form as FormType } from "@/lib/types";

// GENERAL LOGIN
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export async function login(data: z.infer<typeof loginSchema>): Promise<{ success: boolean; role?: 'superadmin' | 'trainer' | 'supervisor' | 'formadmin'; user?: SuperAdmin | Supervisor | FormAdmin; trainerId?: string; error?: string }> {
    const validatedFields = loginSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid login data." };
    }
    
    const { username, password } = validatedFields.data;

    try {
        // 1. Check for Superadmin in DB
        const superadminsCollection = collection(db, "superadmins");
        const saQuery = query(superadminsCollection, where("username", "==", username));
        const saSnapshot = await getDocs(saQuery);

        if (!saSnapshot.empty) {
            const superadminDoc = saSnapshot.docs[0];
            const superadminData = superadminDoc.data() as SuperAdmin;
            if (superadminData.password === password) {
                 const { password, ...user } = superadminData;
                 const createdAt = user.createdAt as unknown as Timestamp;
                 return { success: true, role: 'superadmin', user: {id: superadminDoc.id, ...user, createdAt: createdAt?.toDate().toISOString() || new Date().toISOString() } as SuperAdmin };
            }
        }
        
        // 2. Check for Trainer
        const trainersCollection = collection(db, "trainers");
        const tQuery = query(trainersCollection, where("username", "==", username));
        const tSnapshot = await getDocs(tQuery);

        if (!tSnapshot.empty) {
            const trainerDoc = tSnapshot.docs[0];
            const trainerData = trainerDoc.data();
            
            if (trainerData.password === password) {
                const createdAt = trainerData.createdAt as Timestamp;
                const trainer: Trainer = {
                    id: trainerDoc.id,
                    name: trainerData.name,
                    username: trainerData.username,
                    mobile: trainerData.mobile || '',
                    meetingLink: trainerData.meetingLink,
                    createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                };
                return { success: true, role: 'trainer', trainerId: trainerDoc.id, user: trainer as any };
            }
        }

        // 3. Check for Supervisor
        const supervisorsCollection = collection(db, "supervisors");
        const supervisorQuery = query(supervisorsCollection, where("username", "==", username));
        const supervisorSnapshot = await getDocs(supervisorQuery);
        
        if (!supervisorSnapshot.empty) {
            const supervisorDoc = supervisorSnapshot.docs[0];
            const supervisorData = supervisorDoc.data() as Supervisor;
            if (supervisorData.password === password) {
                const { password, ...user } = supervisorData;
                const createdAt = user.createdAt as unknown as Timestamp;
                return { success: true, role: 'supervisor', user: {id: supervisorDoc.id, ...user, createdAt: createdAt?.toDate().toISOString() || new Date().toISOString() } as Supervisor };
            }
        }

        // 4. Check for Form Admin
        const formAdminsCollection = collection(db, "formAdmins");
        const faQuery = query(formAdminsCollection, where("username", "==", username));
        const faSnapshot = await getDocs(faQuery);

        if (!faSnapshot.empty) {
            const formAdminDoc = faSnapshot.docs[0];
            const formAdminData = formAdminDoc.data() as FormAdmin;
            if (formAdminData.password === password) {
                const { password, ...user } = formAdminData;
                const createdAt = user.createdAt as unknown as Timestamp;
                return { success: true, role: 'formadmin', user: {id: formAdminDoc.id, ...user, createdAt: createdAt?.toDate().toISOString() || new Date().toISOString() } as FormAdmin };
            }
        }
        
        // If we didn't find anyone
        return { success: false, error: "Invalid username or password." };

    } catch (error) {
        console.error("Error during login:", error);
        return { success: false, error: "An unexpected error occurred during login." };
    }
}


const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  mobile: z.string().min(10, { message: "A valid mobile number is required." }).optional().or(z.literal('')),
  organization: z.string({
    required_error: "Please select an organization.",
  }).optional(),
  batchId: z.string().min(1, { message: "Batch ID is required." }),
});

export async function registerParticipant(
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
        name: registrationData.name,
        iitpNo: registrationData.iitpNo,
        mobile: registrationData.mobile || '',
        organization: registrationData.organization || '',
        submissionTime: new Date().toISOString(), 
    };

    return { success: true, registration: finalRegistration };
  } catch (error) {
    console.error("Error creating registration:", error);
    return { success: false, error: "Failed to register. Please check your Firestore security rules and configuration." };
  }
}

const joinMeetingSchema = z.object({
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  batchId: z.string().min(1, { message: "Batch ID is required." }),
});

export async function joinMeeting(data: z.infer<typeof joinMeetingSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = joinMeetingSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }

    const { iitpNo, batchId } = validatedFields.data;

    try {
        const participantsCollection = collection(db, "participants");
        const participantQuery = query(participantsCollection, where("iitpNo", "==", iitpNo));
        const participantSnapshot = await getDocs(participantQuery);

        if (participantSnapshot.empty) {
            return { success: false, error: "No participant found with this IITP No. Please register or contact an admin." };
        }
        
        const participantDoc = participantSnapshot.docs[0];
        const participant = { id: participantDoc.id, ...participantDoc.data() } as Participant;
        
        // Check if the user is already registered for this batch
        const registrationsCollection = collection(db, `batches/${batchId}/registrations`);
        const registrationQuery = query(registrationsCollection, where("iitpNo", "==", iitpNo));
        const registrationSnapshot = await getDocs(registrationQuery);

        // If they are not already registered, create a new registration.
        if (registrationSnapshot.empty) {
            const registrationData = {
              name: participant.name,
              iitpNo: participant.iitpNo,
              mobile: participant.mobile || '',
              organization: participant.organization || '',
              submissionTime: serverTimestamp(),
            };
            await addDoc(registrationsCollection, registrationData);
        }
        
        // If they are already registered, we don't need to do anything, just return success.
        return { success: true };

    } catch(error) {
        console.error("Error joining meeting:", error);
        return { success: false, error: "Could not process your request due to a database error." };
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
                course: batchData.course || 'Other',
                startDate: startDate?.toDate().toISOString() || '',
                startTime: batchData.startTime || '00:00',
                endTime: batchData.endTime || '00:00',
                meetingLink: batchData.meetingLink || '',
                trainerId: batchData.trainerId,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                registrations,
                isCancelled: batchData.isCancelled || false,
                cancellationReason: batchData.cancellationReason || '',
                organizations: batchData.organizations || [],
                semester: batchData.semester || '',
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
            course: batchData.course || 'Other',
            startDate: startDate?.toDate().toISOString() || '',
            startTime: batchData.startTime || '00:00',
            endTime: batchData.endTime || '00:00',
            meetingLink: batchData.meetingLink || '',
            trainerId: batchData.trainerId,
            createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            registrations: [],
            isCancelled: batchData.isCancelled || false,
            cancellationReason: batchData.cancellationReason || '',
            organizations: batchData.organizations || [],
            semester: batchData.semester || '',
        };
    } catch (error) {
        console.error('Error fetching batch by ID:', error);
        return null;
    }
}


export async function updateBatch(batchId: string, data: Partial<Pick<Batch, 'name' | 'course' | 'startDate' | 'startTime' | 'endTime' | 'trainerId' | 'organizations' | 'semester'>>): Promise<{success: boolean, error?: string}> {
    if (!data.name || !data.name.trim()) {
        return { success: false, error: "Batch name cannot be empty." };
    }
    if (!data.trainerId) {
        return { success: false, error: "Trainer selection is required."};
    }
    if (!data.course) {
        return { success: false, error: "Course selection is required."};
    }
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        
        const updateData: any = {
            name: data.name,
            course: data.course,
            startTime: data.startTime || '00:00',
            endTime: data.endTime || '00:00',
            trainerId: data.trainerId,
            organizations: data.organizations || [],
            semester: data.semester || '',
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

const cancelBatchSchema = z.object({
  batchId: z.string().min(1),
  reason: z.string().min(1, "A reason for cancellation is required."),
});

export async function cancelBatch(data: z.infer<typeof cancelBatchSchema>): Promise<{success: boolean, error?: string}> {
    const validated = cancelBatchSchema.safeParse(data);
    if(!validated.success) return { success: false, error: "Invalid data."};

    try {
        const { batchId, reason } = validated.data;
        const batchDocRef = doc(db, 'batches', batchId);
        await updateDoc(batchDocRef, {
            isCancelled: true,
            cancellationReason: reason,
        });
        return { success: true };
    } catch(error) {
        console.error("Error cancelling batch:", error);
        return { success: false, error: "Could not cancel batch." };
    }
}

export async function unCancelBatch(batchId: string): Promise<{success: boolean, error?: string}> {
    if(!batchId) return { success: false, error: "Invalid batch ID." };
    try {
        const batchDocRef = doc(db, 'batches', batchId);
        await updateDoc(batchDocRef, {
            isCancelled: false,
            cancellationReason: '',
        });
        return { success: true };
    } catch(error) {
        console.error("Error un-cancelling batch:", error);
        return { success: false, error: "Could not restore batch." };
    }
}


const createBatchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  course: z.any(),
  startDate: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  trainerId: z.string().min(1, "A trainer must be selected."),
  organizations: z.array(z.string()).optional(),
  semester: z.string().optional(),
});

export async function createBatch(data: z.infer<typeof createBatchSchema>): Promise<{success: boolean, error?: string}> {
    const validatedFields = createBatchSchema.safeParse(data);
    if(!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid form data."};
    }

    try {
        const { name, course, startDate, startTime, endTime, trainerId, organizations, semester } = validatedFields.data;
        const batchesCollection = collection(db, "batches");
        await addDoc(batchesCollection, {
            name,
            course,
            startDate: Timestamp.fromDate(startDate),
            startTime,
            endTime,
            trainerId,
            organizations: organizations || [],
            semester: semester || '',
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
            const batchData = batchDoc.data();
            // If there's a trainer ID, get the link from the trainer document
            if (batchData.trainerId) {
                const trainerDocRef = doc(db, 'trainers', batchData.trainerId);
                const trainerDoc = await getDoc(trainerDocRef);
                if (trainerDoc.exists()) {
                    return { link: trainerDoc.data().meetingLink || null };
                }
            }
            // Fallback to meetingLink on the batch itself for old data
            return { link: batchData.meetingLink || null };
        } else {
            return { link: null };
        }
    } catch(error) {
        console.error("Error getting redirect link:", error);
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

            // This is the fix: convert nested timestamps inside examProgress
            const examProgress = data.examProgress || {};
            for(const examId in examProgress) {
                const attempt = examProgress[examId];
                if(attempt.submittedAt && attempt.submittedAt instanceof Timestamp) {
                    attempt.submittedAt = attempt.submittedAt.toDate().toISOString();
                }
                 if(attempt.startedAt && attempt.startedAt instanceof Timestamp) {
                    attempt.startedAt = attempt.startedAt.toDate().toISOString();
                }
            }

            return {
                id: doc.id,
                ...data,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                examProgress: examProgress,
            } as Participant;
        });

        return participants;

    } catch (error) {
        console.error("Error fetching participants with courses:", error);
        return [];
    }
}


export async function getParticipantByIitpNo(iitpNo: string): Promise<Participant | null> {
    try {
        const participantsCollection = collection(db, "participants");
        const q = query(participantsCollection, where("iitpNo", "==", iitpNo));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const participantDoc = querySnapshot.docs[0];
        const data = participantDoc.data();
        const createdAt = data.createdAt as Timestamp;
        
        const examProgress = data.examProgress || {};
        for(const examId in examProgress) {
            const attempt = examProgress[examId];
            if(attempt.submittedAt && attempt.submittedAt instanceof Timestamp) {
                attempt.submittedAt = attempt.submittedAt.toDate().toISOString();
            }
             if(attempt.startedAt && attempt.startedAt instanceof Timestamp) {
                attempt.startedAt = attempt.startedAt.toDate().toISOString();
            }
        }

        return {
            id: participantDoc.id,
            ...data,
            createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            examProgress: examProgress,
        } as Participant;

    } catch (error) {
        console.error("Error fetching participant by IITP No.:", error);
        return null;
    }
}


const participantSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  mobile: z.string().optional(),
  organization: z.string().optional(),
  enrolledCourses: z.array(z.string()).optional(),
  completedLessons: z.array(z.string()).optional(),
  deniedCourses: z.array(z.string()).optional(),
  examProgress: z.record(z.any()).optional(),
  year: z.string().optional(),
  semester: z.string().optional(),
  enrollmentSeason: z.enum(['Summer', 'Winter']).optional(),
  fatherOrHusbandName: z.string().optional(),
  birthDate: z.string().optional(),
  aadharCardNo: z.string().optional(),
  panCardNo: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
  ifscCode: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  sex: z.enum(['Male', 'Female', 'Other']).optional(),
  qualification: z.string().optional(),
  passOutYear: z.string().optional(),
  dateOfEntryIntoService: z.string().optional(),
  address: z.string().optional(),
  designation: z.string().optional(),
  stipend: z.number().optional(),
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
            completedLessons: [], // Initialize empty
            deniedCourses: [], // Initialize empty
            examProgress: {}, // Initialize empty
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
    await updateDoc(participantDocRef, validatedFields.data);
    return { success: true };
  } catch (error) {
    console.error("Error updating participant:", error);
    return { success: false, error: "Could not update participant." };
  }
}

const updateSelectedParticipantsSchema = z.object({
    ids: z.array(z.string().min(1)),
    year: z.string().optional(),
    semester: z.string().optional(),
    enrollmentSeason: z.enum(['Summer', 'Winter']).optional(),
});

export async function updateSelectedParticipants(data: z.infer<typeof updateSelectedParticipantsSchema>): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
    const validated = updateSelectedParticipantsSchema.safeParse(data);
    if (!validated.success) {
        return { success: false, error: "Invalid data provided." };
    }

    const { ids, ...updateData } = validated.data;
    
    if (Object.keys(updateData).length === 0) {
        return { success: false, error: "No update values were provided." };
    }

    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db, "participants", id);
            batch.update(docRef, updateData);
        });

        await batch.commit();
        return { success: true, updatedCount: ids.length };

    } catch (error) {
        console.error("Error bulk updating participants:", error);
        return { success: false, error: "A database error occurred during the bulk update." };
    }
}


export async function addParticipantsInBulk(participants: Omit<Participant, 'id' | 'createdAt' | 'completedLessons' | 'deniedCourses'>[]): Promise<{ success: boolean; error?: string, skippedCount?: number }> {
    const participantsCollection = collection(db, "participants");
    
    try {
        const existingDocsSnapshot = await getDocs(query(participantsCollection));
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
                completedLessons: [], // Initialize empty
                deniedCourses: [], // Initialize empty
                examProgress: {}, // Initialize empty
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
        return { success: false, error: "Could not add participants in bulk due to a database error." };
    }
}

const transferStudentsSchema = z.object({
  sourceCourseName: z.string().min(1, "Source course is required."),
  destinationCourseName: z.string().min(1, "Destination course is required."),
});

export async function transferStudents(data: z.infer<typeof transferStudentsSchema>): Promise<{ success: boolean; error?: string; transferredCount?: number }> {
    const validated = transferStudentsSchema.safeParse(data);
    if(!validated.success) {
        return { success: false, error: "Invalid data." };
    }

    const { sourceCourseName, destinationCourseName } = validated.data;
    if (sourceCourseName === destinationCourseName) {
        return { success: false, error: "Source and destination courses cannot be the same." };
    }

    try {
        const participantsCollection = collection(db, "participants");
        const q = query(participantsCollection, where("enrolledCourses", "array-contains", sourceCourseName));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: true, transferredCount: 0, error: "No students found in the source course to transfer." };
        }

        const batch = writeBatch(db);
        let transferredCount = 0;

        snapshot.docs.forEach(doc => {
            const participant = doc.data() as Participant;
            const alreadyInDest = participant.enrolledCourses?.includes(destinationCourseName);

            // Update only if they are not already in the destination course
            if (!alreadyInDest) {
                 batch.update(doc.ref, {
                    enrolledCourses: arrayUnion(destinationCourseName)
                });
            }

            // Remove the source course regardless
            batch.update(doc.ref, {
                enrolledCourses: arrayRemove(sourceCourseName)
            });

            // We count a transfer if the source course existed, even if they were already in the destination
            transferredCount++;
        });

        await batch.commit();

        return { success: true, transferredCount };

    } catch (error) {
        console.error("Error transferring students:", error);
        return { success: false, error: "A database error occurred during the transfer." };
    }
}

// SUPERADMIN ACTIONS
const superAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  mobile: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  canManageAdmins: z.boolean().optional(),
  currentUserId: z.string().optional(), // ID of the admin performing the action
});

export async function getSuperAdmins(): Promise<SuperAdmin[]> {
    try {
        const superAdminsCollectionRef = collection(db, "superadmins");
        const q = query(superAdminsCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: doc.id,
                name: data.name,
                mobile: data.mobile || '',
                username: data.username,
                canManageAdmins: data.canManageAdmins || false,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                createdBy: data.createdBy,
            };
        });
    } catch (error) {
        console.error("Error fetching superadmins:", error);
        return [];
    }
}

export async function addSuperAdmin(data: z.infer<typeof superAdminSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = superAdminSchema.safeParse(data);
    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid data." };
    }
    
    try {
        const { currentUserId, ...adminData } = validatedFields.data;
        const superAdminsCollection = collection(db, "superadmins");
        
        const duplicateQuery = query(superAdminsCollection, where("username", "==", adminData.username));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if(!duplicateSnapshot.empty) {
            return { success: false, error: "This username is already taken."};
        }
        
        const newAdminData: any = {
            ...adminData,
            canManageAdmins: adminData.canManageAdmins || false,
            createdAt: serverTimestamp(),
        };

        if(currentUserId) {
            newAdminData.createdBy = currentUserId;
        }

        await addDoc(superAdminsCollection, newAdminData);
        return { success: true };
    } catch (error) {
        console.error("Error adding superadmin:", error);
        return { success: false, error: "Could not add superadmin." };
    }
}

export async function deleteSuperAdmin(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) return { success: false, error: "Invalid ID." };
    try {
        const adminDocRef = doc(db, 'superadmins', id);
        await deleteDoc(adminDocRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting superadmin:", error);
        return { success: false, error: "Could not delete the superadmin." };
    }
}

const updateSuperAdminSchema = superAdminSchema.extend({
    id: z.string().min(1),
    password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
}).partial().required({ id: true });


export async function updateSuperAdmin(data: z.infer<typeof updateSuperAdminSchema>): Promise<{ success: boolean; error?: string }> {
    const { id, ...adminData } = data;
    const validatedFields = updateSuperAdminSchema.safeParse(data);
    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten().fieldErrors)
        return { success: false, error: "Invalid data." };
    }

    try {
        const adminDocRef = doc(db, 'superadmins', id);
        const updateData: any = {};
        if (adminData.name) {
            updateData.name = adminData.name;
        }
        if (adminData.mobile) {
            updateData.mobile = adminData.mobile;
        }
        if (adminData.username) {
            // Check for duplicate username if it's being changed
            const originalDoc = await getDoc(adminDocRef);
            if(originalDoc.exists() && originalDoc.data().username !== adminData.username) {
                const duplicateQuery = query(collection(db, "superadmins"), where("username", "==", adminData.username));
                const duplicateSnapshot = await getDocs(duplicateQuery);
                if(!duplicateSnapshot.empty) {
                    return { success: false, error: "This username is already taken." };
                }
            }
            updateData.username = adminData.username;
        }
        if (adminData.password) {
            updateData.password = adminData.password;
        }
        if (typeof adminData.canManageAdmins === 'boolean') {
            updateData.canManageAdmins = adminData.canManageAdmins;
        }

        if (Object.keys(updateData).length > 0) {
             await updateDoc(adminDocRef, updateData);
        }
       
        return { success: true };

    } catch (error) {
        console.error("Error updating superadmin:", error);
        return { success: false, error: "Could not update superadmin." };
    }
}

export async function isPrimaryAdmin(id: string): Promise<{ isPrimary: boolean }> {
    // The primary admin is the first one created.
    try {
        const superAdminsCollection = collection(db, "superadmins");
        const q = query(superAdminsCollection, orderBy("createdAt", "asc"), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            // This case should ideally not happen if there's at least one admin
            return { isPrimary: false };
        }
        
        const firstAdminDoc = snapshot.docs[0];
        return { isPrimary: firstAdminDoc.id === id };

    } catch (error) {
        console.error("Error checking for primary admin:", error);
        return { isPrimary: false };
    }
}



// TRAINER ACTIONS
const trainerSchema = z.object({
  name: z.string().min(2, "Trainer name must be at least 2 characters."),
  mobile: z.string().optional(),
  meetingLink: z.string().url("Must be a valid meeting URL."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
});

export async function getTrainers(): Promise<Trainer[]> {
    try {
        const trainersCollectionRef = collection(db, "trainers");
        const q = query(trainersCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: doc.id,
                name: data.name,
                mobile: data.mobile || '',
                meetingLink: data.meetingLink,
                username: data.username,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error("Error fetching trainers:", error);
        return [];
    }
}

export async function addTrainer(data: z.infer<typeof trainerSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = trainerSchema.safeParse(data);
    if (!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid trainer data." };
    }
     if (!validatedFields.data.password) {
        return { success: false, error: "Password is required for new trainers."};
    }
    
    try {
        const trainersCollection = collection(db, "trainers");
        
        // Check for duplicate username
        const duplicateQuery = query(trainersCollection, where("username", "==", data.username));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if(!duplicateSnapshot.empty) {
            return { success: false, error: "This username is already taken."};
        }

        await addDoc(trainersCollection, {
            ...validatedFields.data,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding trainer:", error);
        return { success: false, error: "Could not add trainer." };
    }
}

const updateTrainerSchema = trainerSchema.extend({
  id: z.string().min(1),
});

export async function updateTrainer(data: z.infer<typeof updateTrainerSchema>): Promise<{ success: boolean; error?: string }> {
    const { id, ...trainerData } = data;
    const validatedFields = trainerSchema.safeParse(trainerData);
    if (!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid trainer data." };
    }
    
    try {
        const trainerDocRef = doc(db, 'trainers', id);
        
        // Check if username is being changed and if it's a duplicate
        const originalDoc = await getDoc(trainerDocRef);
        if (originalDoc.exists() && originalDoc.data().username !== validatedFields.data.username) {
            const trainersCollection = collection(db, "trainers");
            const duplicateQuery = query(trainersCollection, where("username", "==", validatedFields.data.username));
            const duplicateSnapshot = await getDocs(duplicateQuery);
            if(!duplicateSnapshot.empty) {
                return { success: false, error: "This username is already taken."};
            }
        }

        const updateData: any = { ...validatedFields.data };
        if (!updateData.password) {
            // Don't update password if it's empty
            delete updateData.password;
        }
        
        await updateDoc(trainerDocRef, updateData);
        return { success: true };
    } catch (error) {
        console.error("Error updating trainer:", error);
        return { success: false, error: "Could not update trainer." };
    }
}


export async function deleteTrainer(trainerId: string): Promise<{ success: boolean, error?: string }> {
    try {
        // Optional: Check if trainer is assigned to any batches before deleting
        const batchesQuery = query(collection(db, 'batches'), where('trainerId', '==', trainerId));
        const batchesSnapshot = await getDocs(batchesQuery);
        if (!batchesSnapshot.empty) {
            return { success: false, error: `Cannot delete trainer. They are assigned to ${batchesSnapshot.size} batch(es). Please reassign them first.` };
        }

        const trainerDocRef = doc(db, 'trainers', trainerId);
        await deleteDoc(trainerDocRef);
        return { success: true };

    } catch (error) {
        console.error("Error deleting trainer:", error);
        return { success: false, error: "Could not delete the trainer." };
    }
}


// COURSE AND SUBJECT ACTIONS

// Helper to ensure 'courses' collection and docs exist
async function initializeCourses() {
    const coursesCollectionRef = collection(db, "courses");
    const coursesSnapshot = await getDocs(coursesCollectionRef);

    if (coursesSnapshot.empty) {
        const batch = writeBatch(db);
        const diplomaDocRef = doc(coursesCollectionRef, 'diploma');
        const advDiplomaDocRef = doc(coursesCollectionRef, 'advance-diploma');
        batch.set(diplomaDocRef, { name: 'Diploma', subjects: [], status: 'active' });
        batch.set(advDiplomaDocRef, { name: 'Advance Diploma', subjects: [], status: 'active' });
        await batch.commit();
    }
}

const addCourseSchema = z.object({
  name: z.string().min(2, { message: "Course name must be at least 2 characters." }),
  status: z.enum(['active', 'coming-soon', 'deactivated']),
});

export async function addCourse(data: z.infer<typeof addCourseSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = addCourseSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid course name." };
    }

    try {
        const { name, status } = validatedFields.data;
        const coursesCollection = collection(db, "courses");

        // Optional: Check for duplicate course names
        const duplicateQuery = query(coursesCollection, where("name", "==", name));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if (!duplicateSnapshot.empty) {
            return { success: false, error: "A course with this name already exists." };
        }

        await addDoc(coursesCollection, {
            name,
            status,
            subjects: [],
            exams: [],
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding course:", error);
        return { success: false, error: "Could not add course." };
    }
}


export async function getCourses(): Promise<Course[]> {
    try {
        await initializeCourses(); 
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        
        const courses: Course[] = [];

        for (const courseDoc of coursesSnapshot.docs) {
            const courseData = courseDoc.data();
            const subjects: Subject[] = (courseData.subjects || []).map((subject: any) => ({
                ...subject,
                units: (subject.units || []).map((unit: any) => ({
                    ...unit,
                    lessons: unit.lessons || []
                }))
            }));
            const exams: Exam[] = (courseData.exams || []).map((exam: any) => ({
                ...exam,
                questions: exam.questions || []
            }));

            courses.push({
                id: courseDoc.id,
                name: courseData.name,
                subjects: subjects.sort((a, b) => a.name.localeCompare(b.name)),
                status: courseData.status || 'active',
                exams: exams,
            });
        }
        
        return courses;
    } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
    }
}

export async function getCourseById(courseId: string): Promise<Course | null> {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);

        if (!courseDoc.exists()) {
            return null;
        }

        const courseData = courseDoc.data();
        const subjects: Subject[] = (courseData.subjects || []).map((subject: any) => ({
            ...subject,
            units: (subject.units || []).map((unit: any) => ({
                ...unit,
                lessons: unit.lessons || []
            }))
        }));
        const exams: Exam[] = (courseData.exams || []).map((exam: any) => ({
                ...exam,
                questions: exam.questions || []
        }));

        return {
            id: courseDoc.id,
            name: courseData.name,
            subjects: subjects.sort((a, b) => a.name.localeCompare(b.name)),
            status: courseData.status || 'active',
            exams: exams,
        };
    } catch (error) {
        console.error("Error fetching course by ID:", error);
        return null;
    }
}

const deleteCourseSchema = z.object({
    courseId: z.string().min(1),
});

export async function deleteCourse(data: z.infer<typeof deleteCourseSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = deleteCourseSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId } = validatedFields.data;
        const courseDocRef = doc(db, 'courses', courseId);
        await deleteDoc(courseDocRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting course:", error);
        return { success: false, error: "Could not delete course." };
    }
}

const updateCourseNameSchema = z.object({
  courseId: z.string().min(1),
  newName: z.string().min(2, { message: "Course name must be at least 2 characters." }),
});

export async function updateCourseName(data: z.infer<typeof updateCourseNameSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = updateCourseNameSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, newName } = validatedFields.data;
        const courseDocRef = doc(db, 'courses', courseId);
        await updateDoc(courseDocRef, { name: newName });
        return { success: true };
    } catch (error) {
        console.error("Error updating course name:", error);
        return { success: false, error: "Could not update course name." };
    }
}

const updateCourseStatusSchema = z.object({
  courseId: z.string().min(1),
  status: z.enum(['active', 'coming-soon', 'deactivated']),
});

export async function updateCourseStatus(data: z.infer<typeof updateCourseStatusSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = updateCourseStatusSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, status } = validatedFields.data;
        const courseDocRef = doc(db, 'courses', courseId);
        await updateDoc(courseDocRef, { status: status });
        return { success: true };
    } catch (error) {
        console.error("Error updating course status:", error);
        return { success: false, error: "Could not update course status." };
    }
}



const addSubjectSchema = z.object({
  courseId: z.string().min(1),
  subjectName: z.string().min(2, { message: "Subject name must be at least 2 characters." }),
});

export async function addSubject(data: z.infer<typeof addSubjectSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = addSubjectSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid subject data." };
    }

    try {
        const { courseId, subjectName } = validatedFields.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        
        if(!courseDoc.exists()) {
            return { success: false, error: "Course not found." };
        }

        const subjects = courseDoc.data().subjects || [];
        const duplicate = subjects.some((s: Subject) => s.name.toLowerCase() === subjectName.toLowerCase());

        if (duplicate) {
             return { success: false, error: "This subject already exists in this course." };
        }

        const newSubject: Subject = {
            id: doc(collection(db, '_')).id, // Generate a unique ID
            name: subjectName,
            units: [],
        };
        
        await updateDoc(courseDocRef, {
            subjects: arrayUnion(newSubject)
        });

        return { success: true };
    } catch (error) {
        console.error("Error adding subject:", error);
        return { success: false, error: "Could not add subject due to a database error." };
    }
}

const updateSubjectSchema = z.object({
  courseId: z.string().min(1),
  subjectId: z.string().min(1),
  newName: z.string().min(2, { message: "Subject name must be at least 2 characters." }),
});

export async function updateSubject(data: z.infer<typeof updateSubjectSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = updateSubjectSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, subjectId, newName } = validatedFields.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);

        if(!courseDoc.exists()) {
            return { success: false, error: "Course not found." };
        }
        
        const subjects = courseDoc.data().subjects || [];
        const subjectIndex = subjects.findIndex((s: Subject) => s.id === subjectId);

        if (subjectIndex === -1) {
            return { success: false, error: "Subject not found." };
        }

        subjects[subjectIndex].name = newName;
        
        await updateDoc(courseDocRef, { subjects: subjects });
        return { success: true };
    } catch (error) {
        console.error("Error updating subject:", error);
        return { success: false, error: "Could not update subject." };
    }
}

const deleteSubjectSchema = z.object({
  courseId: z.string().min(1),
  subjectId: z.string().min(1),
});

export async function deleteSubject(data: z.infer<typeof deleteSubjectSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = deleteSubjectSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }
    
    try {
        const { courseId, subjectId } = validatedFields.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);

        if(!courseDoc.exists()) {
            return { success: false, error: "Course not found." };
        }
        
        const subjects = courseDoc.data().subjects || [];
        const subjectToDelete = subjects.find((s: Subject) => s.id === subjectId);

        if (!subjectToDelete) {
             return { success: false, error: "Subject not found." };
        }
        
        await updateDoc(courseDocRef, {
            subjects: arrayRemove(subjectToDelete)
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting subject:", error);
        return { success: false, error: "Could not delete subject." };
    }
}

// UNIT ACTIONS
const unitSchema = z.object({
    courseId: z.string().min(1),
    subjectId: z.string().min(1),
    unitTitle: z.string().min(2, "Unit title must be at least 2 characters."),
});

export async function addUnit(data: z.infer<typeof unitSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = unitSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { courseId, subjectId, unitTitle } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const subjects: Subject[] = courseDoc.data().subjects || [];
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex === -1) return { success: false, error: "Subject not found." };

        const newUnit: Unit = {
            id: doc(collection(db, '_')).id,
            title: unitTitle,
            lessons: []
        };
        
        subjects[subjectIndex].units.push(newUnit);

        await updateDoc(courseDocRef, { subjects });
        return { success: true };
    } catch (error) {
        console.error("Error adding unit:", error);
        return { success: false, error: "Could not add unit." };
    }
}

const updateUnitSchema = unitSchema.extend({ unitId: z.string().min(1) });

export async function updateUnit(data: z.infer<typeof updateUnitSchema>): Promise<{ success: boolean; error?: string }> {
     const validated = updateUnitSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { courseId, subjectId, unitId, unitTitle } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const subjects: Subject[] = courseDoc.data().subjects || [];
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex === -1) return { success: false, error: "Subject not found." };
        
        const unitIndex = subjects[subjectIndex].units.findIndex(u => u.id === unitId);
        if (unitIndex === -1) return { success: false, error: "Unit not found." };

        subjects[subjectIndex].units[unitIndex].title = unitTitle;

        await updateDoc(courseDocRef, { subjects });
        return { success: true };
    } catch (error) {
        console.error("Error updating unit:", error);
        return { success: false, error: "Could not update unit." };
    }
}

const deleteUnitSchema = z.object({
    courseId: z.string().min(1),
    subjectId: z.string().min(1),
    unitId: z.string().min(1),
});

export async function deleteUnit(data: z.infer<typeof deleteUnitSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = deleteUnitSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { courseId, subjectId, unitId } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const subjects: Subject[] = courseDoc.data().subjects || [];
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex === -1) return { success: false, error: "Subject not found." };

        subjects[subjectIndex].units = subjects[subjectIndex].units.filter(u => u.id !== unitId);

        await updateDoc(courseDocRef, { subjects });
        return { success: true };
    } catch (error) {
        console.error("Error deleting unit:", error);
        return { success: false, error: "Could not delete unit." };
    }
}


// LESSON ACTIONS
const lessonSchema = z.object({
    courseId: z.string().min(1),
    subjectId: z.string().min(1),
    unitId: z.string().min(1),
    lessonTitle: z.string().min(2, "Lesson title is required."),
    videoUrl: z.string().url("A valid video URL is required."),
    description: z.string().optional(),
    documentUrl: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
    duration: z.number().optional(),
});

export async function addLesson(data: z.infer<typeof lessonSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = lessonSchema.safeParse(data);
    if (!validated.success) {
      console.log(validated.error.flatten().fieldErrors);
      return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, subjectId, unitId, lessonTitle, videoUrl, duration, description, documentUrl } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const subjects: Subject[] = courseDoc.data().subjects || [];
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex === -1) return { success: false, error: "Subject not found." };
        
        const unitIndex = subjects[subjectIndex].units.findIndex(u => u.id === unitId);
        if (unitIndex === -1) return { success: false, error: "Unit not found." };

        const newLesson: Lesson = {
            id: doc(collection(db, '_')).id,
            title: lessonTitle,
            videoUrl,
            duration,
            description,
            documentUrl,
        };
        
        subjects[subjectIndex].units[unitIndex].lessons.push(newLesson);

        await updateDoc(courseDocRef, { subjects });
        return { success: true };
    } catch (error) {
        console.error("Error adding lesson:", error);
        return { success: false, error: "Could not add lesson." };
    }
}

const updateLessonSchema = lessonSchema.extend({ lessonId: z.string().min(1) });

export async function updateLesson(data: z.infer<typeof updateLessonSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = updateLessonSchema.safeParse(data);
    if (!validated.success) {
        console.log(validated.error.flatten().fieldErrors);
        return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, subjectId, unitId, lessonId, lessonTitle, videoUrl, duration, description, documentUrl } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const subjects: Subject[] = courseDoc.data().subjects || [];
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex === -1) return { success: false, error: "Subject not found." };
        
        const unitIndex = subjects[subjectIndex].units.findIndex(u => u.id === unitId);
        if (unitIndex === -1) return { success: false, error: "Unit not found." };
        
        const lessonIndex = subjects[subjectIndex].units[unitIndex].lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex === -1) return { success: false, error: "Lesson not found." };
        
        subjects[subjectIndex].units[unitIndex].lessons[lessonIndex] = {
            id: lessonId,
            title: lessonTitle,
            videoUrl,
            duration,
            description,
            documentUrl,
        };

        await updateDoc(courseDocRef, { subjects });
        return { success: true };
    } catch (error) {
        console.error("Error updating lesson:", error);
        return { success: false, error: "Could not update lesson." };
    }
}

const deleteLessonSchema = z.object({
    courseId: z.string().min(1),
    subjectId: z.string().min(1),
    unitId: z.string().min(1),
    lessonId: z.string().min(1),
});

export async function deleteLesson(data: z.infer<typeof deleteLessonSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = deleteLessonSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { courseId, subjectId, unitId, lessonId } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const subjects: Subject[] = courseDoc.data().subjects || [];
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex === -1) return { success: false, error: "Subject not found." };
        
        const unitIndex = subjects[subjectIndex].units.findIndex(u => u.id === unitId);
        if (unitIndex === -1) return { success: false, error: "Unit not found." };
        
        subjects[subjectIndex].units[unitIndex].lessons = subjects[subjectIndex].units[unitIndex].lessons.filter(l => l.id !== lessonId);

        await updateDoc(courseDocRef, { subjects });
        return { success: true };
    } catch (error) {
        console.error("Error deleting lesson:", error);
        return { success: false, error: "Could not delete lesson." };
    }
}

// EXAM ACTIONS
const addExamSchema = z.object({
    courseId: z.string().min(1),
    title: z.string().min(2, "Exam title is required."),
    duration: z.number().positive().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export async function addExam(data: z.infer<typeof addExamSchema>): Promise<{ success: boolean, error?: string }> {
    const validated = addExamSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { courseId, title, duration, status } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        
        const newExam: Omit<Exam, 'id'> = {
            title,
            courseId: courseId,
            questions: [],
            duration,
            createdAt: new Date().toISOString(),
            status: status || 'active',
        };
        
        await updateDoc(courseDocRef, {
            exams: arrayUnion({
                id: doc(collection(db, '_')).id,
                ...newExam,
            })
        });

        return { success: true };
    } catch (error) {
        console.error("Error adding exam:", error);
        return { success: false, error: "Could not add exam." };
    }
}

const updateExamSchema = addExamSchema.extend({ examId: z.string().min(1) });

export async function updateExam(data: z.infer<typeof updateExamSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = updateExamSchema.safeParse(data);
    if (!validated.success) {
        console.log(validated.error.flatten().fieldErrors);
        return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, examId, title, duration, status } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const exams: Exam[] = courseDoc.data().exams || [];
        const examIndex = exams.findIndex(e => e.id === examId);
        if (examIndex === -1) return { success: false, error: "Exam not found." };

        exams[examIndex].title = title;
        exams[examIndex].duration = duration;
        exams[examIndex].status = status || 'active';

        await updateDoc(courseDocRef, { exams });
        return { success: true };
    } catch (error) {
        console.error("Error updating exam:", error);
        return { success: false, error: "Could not update exam." };
    }
}

const deleteExamSchema = z.object({
    courseId: z.string().min(1),
    examId: z.string().min(1),
});

export async function deleteExam(data: z.infer<typeof deleteExamSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = deleteExamSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };
    
    try {
        const { courseId, examId } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const exams: Exam[] = courseDoc.data().exams || [];
        const examToDelete = exams.find(e => e.id === examId);
        if (!examToDelete) return { success: false, error: "Exam not found." };

        await updateDoc(courseDocRef, {
            exams: arrayRemove(examToDelete)
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting exam:", error);
        return { success: false, error: "Could not delete exam." };
    }
}


// QUESTION ACTIONS
const questionSchema = z.object({
    text: z.string().min(5, "Question text is required."),
    type: z.enum(['mcq', 'checkbox', 'short-answer', 'paragraph']),
    options: z.array(z.string().min(1)),
    correctAnswers: z.array(z.union([z.string(), z.number()])).min(0),
    rationale: z.string().optional(),
});

const addQuestionSchema = questionSchema.extend({
    courseId: z.string().min(1),
    examId: z.string().min(1),
});

export async function addQuestion(data: z.infer<typeof addQuestionSchema>): Promise<{ success: boolean, error?: string }> {
    const validated = addQuestionSchema.safeParse(data);
    if (!validated.success) {
      console.log(validated.error.flatten().fieldErrors);
      return { success: false, error: "Invalid question data." };
    }

    try {
        const { courseId, examId, ...questionData } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const exams: Exam[] = courseDoc.data().exams || [];
        const examIndex = exams.findIndex(e => e.id === examId);
        if (examIndex === -1) return { success: false, error: "Exam not found." };

        const newQuestion: Question = {
            id: doc(collection(db, '_')).id,
            ...questionData,
        };

        exams[examIndex].questions.push(newQuestion);
        
        await updateDoc(courseDocRef, { exams });
        return { success: true };
    } catch (error) {
        console.error("Error adding question:", error);
        return { success: false, error: "Could not add question." };
    }
}

const updateQuestionSchema = addQuestionSchema.extend({ questionId: z.string().min(1) });

export async function updateQuestion(data: z.infer<typeof updateQuestionSchema>): Promise<{ success: boolean, error?: string }> {
    const validated = updateQuestionSchema.safeParse(data);
    if (!validated.success) {
        console.log(validated.error.flatten().fieldErrors)
        return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, examId, questionId, ...questionData } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const exams: Exam[] = courseDoc.data().exams || [];
        const examIndex = exams.findIndex(e => e.id === examId);
        if (examIndex === -1) return { success: false, error: "Exam not found." };

        const questionIndex = exams[examIndex].questions.findIndex(q => q.id === questionId);
        if (questionIndex === -1) return { success: false, error: "Question not found." };

        exams[examIndex].questions[questionIndex] = {
            id: questionId,
            ...questionData,
        };

        await updateDoc(courseDocRef, { exams });
        return { success: true };
    } catch (error) {
        console.error("Error updating question:", error);
        return { success: false, error: "Could not update question." };
    }
}

const deleteQuestionSchema = z.object({
    courseId: z.string().min(1),
    examId: z.string().min(1),
    questionId: z.string().min(1),
});

export async function deleteQuestion(data: z.infer<typeof deleteQuestionSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = deleteQuestionSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };
    
    try {
        const { courseId, examId, questionId } = validated.data;
        const courseDocRef = doc(db, `courses/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);
        if (!courseDoc.exists()) return { success: false, error: "Course not found." };

        const exams: Exam[] = courseDoc.data().exams || [];
        const examIndex = exams.findIndex(e => e.id === examId);
        if (examIndex === -1) return { success: false, error: "Exam not found." };

        exams[examIndex].questions = exams[examIndex].questions.filter(q => q.id !== questionId);
        
        await updateDoc(courseDocRef, { exams });
        return { success: true };
    } catch (error) {
        console.error("Error deleting question:", error);
        return { success: false, error: "Could not delete question." };
    }
}


// STUDENT LOGIN
const studentLoginSchema = z.object({
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  passkey: z.string().min(1, { message: "Passkey is required." }),
});

export async function studentLogin(data: z.infer<typeof studentLoginSchema>): Promise<{ success: boolean; iitpNo?: string; error?: string }> {
    const validatedFields = studentLoginSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid login data." };
    }

    try {
        const { iitpNo, passkey } = validatedFields.data;
        const participantsCollection = collection(db, "participants");
        const q = query(participantsCollection, where("iitpNo", "==", iitpNo));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: "Invalid IITP No. or Passkey." };
        }

        const participantDoc = querySnapshot.docs[0];
        const participant = participantDoc.data() as Participant;

        // Passkey is the registered mobile number
        if (participant.mobile === passkey) {
            return { success: true, iitpNo: participant.iitpNo };
        } else {
            return { success: false, error: "Invalid IITP No. or Passkey." };
        }

    } catch (error) {
        console.error("Error during student login:", error);
        return { success: false, error: "An unexpected error occurred." };
    }
}


// PROGRESS TRACKING
const markLessonCompleteSchema = z.object({
    participantId: z.string().min(1),
    lessonId: z.string().min(1),
});

export async function markLessonAsComplete(data: z.infer<typeof markLessonCompleteSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = markLessonCompleteSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data provided." };

    try {
        const { participantId, lessonId } = validated.data;
        const participantDocRef = doc(db, 'participants', participantId);
        
        await updateDoc(participantDocRef, {
            completedLessons: arrayUnion(lessonId)
        });

        return { success: true };
    } catch(error) {
        console.error("Error marking lesson as complete:", error);
        return { success: false, error: "Could not update your progress." };
    }
}


// ORGANIZATION ACTIONS
export async function getOrganizations(): Promise<Organization[]> {
    try {
        const organizationsCollectionRef = collection(db, "organizations");
        const q = query(organizationsCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: doc.id,
                name: data.name,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error("Error fetching organizations:", error);
        return [];
    }
}

const addOrganizationSchema = z.object({
  name: z.string().min(2, { message: "Organization name must be at least 2 characters." }),
});

export async function addOrganization(data: z.infer<typeof addOrganizationSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = addOrganizationSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }
    
    try {
        const { name } = validatedFields.data;
        const organizationsCollection = collection(db, "organizations");
        
        const duplicateQuery = query(organizationsCollection, where("name", "==", name));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if(!duplicateSnapshot.empty) {
            return { success: false, error: "This organization already exists."};
        }
        
        await addDoc(organizationsCollection, {
            name,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding organization:", error);
        return { success: false, error: "Could not add organization." };
    }
}

export async function backfillOrganizationsFromParticipants(): Promise<{success: boolean; count: number; error?: string}> {
    try {
        const participantsSnapshot = await getDocs(collection(db, "participants"));
        const organizationsSnapshot = await getDocs(collection(db, "organizations"));

        const participantOrgNames = new Set(
            participantsSnapshot.docs
                .map(doc => doc.data().organization)
                .filter(Boolean) // Filter out empty/undefined organization names
        );

        const existingOrgNames = new Set(
            organizationsSnapshot.docs.map(doc => doc.data().name)
        );

        const missingOrgNames = [...participantOrgNames].filter(name => !existingOrgNames.has(name));

        if (missingOrgNames.length === 0) {
            return { success: true, count: 0 };
        }

        const batch = writeBatch(db);
        const organizationsCollection = collection(db, "organizations");

        missingOrgNames.forEach(name => {
            const newDocRef = doc(organizationsCollection);
            batch.set(newDocRef, {
                name,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();

        return { success: true, count: missingOrgNames.length };

    } catch(error) {
        console.error("Error backfilling organizations:", error);
        return { success: false, count: 0, error: "A database error occurred." };
    }
}


// SUPERVISOR ACTIONS
const supervisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
});

export async function getSupervisors(): Promise<Supervisor[]> {
    try {
        const supervisorsCollectionRef = collection(db, "supervisors");
        const q = query(supervisorsCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            const { password, ...rest } = data;
            return {
                id: doc.id,
                ...rest,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            } as Supervisor;
        });
    } catch (error) {
        console.error("Error fetching supervisors:", error);
        return [];
    }
}

export async function addSupervisor(data: z.infer<typeof supervisorSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = supervisorSchema.safeParse(data);
    if (!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid data." };
    }
    if (!validatedFields.data.password) {
        return { success: false, error: "Password is required for new supervisors." };
    }
    
    try {
        const { username, ...rest } = validatedFields.data;
        const supervisorsCollection = collection(db, "supervisors");
        
        const duplicateQuery = query(supervisorsCollection, where("username", "==", username));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if(!duplicateSnapshot.empty) {
            return { success: false, error: "This username is already taken."};
        }
        
        await addDoc(supervisorsCollection, {
            username,
            ...rest,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding supervisor:", error);
        return { success: false, error: "Could not add supervisor." };
    }
}

const updateSupervisorSchema = supervisorSchema.extend({
  id: z.string().min(1),
});

export async function updateSupervisor(data: z.infer<typeof updateSupervisorSchema>): Promise<{ success: boolean; error?: string }> {
    const { id, ...adminData } = data;
    const validatedFields = supervisorSchema.safeParse(adminData);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }

    try {
        const adminDocRef = doc(db, 'supervisors', id);
        
        const originalDoc = await getDoc(adminDocRef);
        if (originalDoc.exists() && originalDoc.data().username !== validatedFields.data.username) {
            const duplicateQuery = query(collection(db, "supervisors"), where("username", "==", validatedFields.data.username));
            const duplicateSnapshot = await getDocs(duplicateQuery);
            if(!duplicateSnapshot.empty) {
                return { success: false, error: "This username is already taken." };
            }
        }

        const updateData: any = { ...validatedFields.data };
        if (!updateData.password) {
            delete updateData.password;
        }

        await updateDoc(adminDocRef, updateData);
        return { success: true };

    } catch (error) {
        console.error("Error updating supervisor:", error);
        return { success: false, error: "Could not update supervisor." };
    }
}

export async function deleteSupervisor(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) return { success: false, error: "Invalid ID." };
    try {
        const adminDocRef = doc(db, 'supervisors', id);
        await deleteDoc(adminDocRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting supervisor:", error);
        return { success: false, error: "Could not delete supervisor." };
    }
}

// FORM ADMIN ACTIONS
const formAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
});

export async function getFormAdmins(): Promise<FormAdmin[]> {
    try {
        const formAdminsCollectionRef = collection(db, "formAdmins");
        const q = query(formAdminsCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            const { password, ...rest } = data;
            return {
                id: doc.id,
                ...rest,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            } as FormAdmin;
        });
    } catch (error) {
        console.error("Error fetching form admins:", error);
        return [];
    }
}

export async function addFormAdmin(data: z.infer<typeof formAdminSchema>): Promise<{ success: boolean; error?: string }> {
    const validatedFields = formAdminSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }
    if (!validatedFields.data.password) {
        return { success: false, error: "Password is required for new admins." };
    }
    
    try {
        const { username } = validatedFields.data;
        const formAdminsCollection = collection(db, "formAdmins");
        
        const duplicateQuery = query(formAdminsCollection, where("username", "==", username));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if(!duplicateSnapshot.empty) {
            return { success: false, error: "This username is already taken."};
        }
        
        await addDoc(formAdminsCollection, {
            ...validatedFields.data,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding form admin:", error);
        return { success: false, error: "Could not add form admin." };
    }
}

const updateFormAdminSchema = formAdminSchema.extend({
  id: z.string().min(1),
});

export async function updateFormAdmin(data: z.infer<typeof updateFormAdminSchema>): Promise<{ success: boolean; error?: string }> {
    const { id, ...adminData } = data;
    const validatedFields = formAdminSchema.safeParse(adminData);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }

    try {
        const adminDocRef = doc(db, 'formAdmins', id);
        
        const originalDoc = await getDoc(adminDocRef);
        if (originalDoc.exists() && originalDoc.data().username !== validatedFields.data.username) {
            const duplicateQuery = query(collection(db, "formAdmins"), where("username", "==", validatedFields.data.username));
            const duplicateSnapshot = await getDocs(duplicateQuery);
            if(!duplicateSnapshot.empty) {
                return { success: false, error: "This username is already taken." };
            }
        }

        const updateData: any = { ...validatedFields.data };
        if (!updateData.password) {
            delete updateData.password;
        }

        await updateDoc(adminDocRef, updateData);
        return { success: true };

    } catch (error) {
        console.error("Error updating form admin:", error);
        return { success: false, error: "Could not update form admin." };
    }
}

export async function deleteFormAdmin(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) return { success: false, error: "Invalid ID." };
    try {
        const adminDocRef = doc(db, 'formAdmins', id);
        await deleteDoc(adminDocRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting form admin:", error);
        return { success: false, error: "Could not delete form admin." };
    }
}


const verifyExamAccessSchema = z.object({
  iitpNo: z.string().min(1),
  examId: z.string().min(1),
});

export async function verifyExamAccess(data: z.infer<typeof verifyExamAccessSchema>): Promise<{ success: boolean; error?: string, courseId?: string; }> {
    const validated = verifyExamAccessSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data" };

    try {
        const { iitpNo, examId } = validated.data;
        const participant = await getParticipantByIitpNo(iitpNo);
        if (!participant) {
            return { success: false, error: "No participant found with this IITP No." };
        }

        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        let foundCourseId: string | null = null;
        let foundCourseName: string | null = null;
        let foundExam: Exam | null = null;
        
        for (const courseDoc of coursesSnapshot.docs) {
            const courseData = courseDoc.data() as Course;
            const examExists = courseData.exams?.find(e => e.id === examId);
            if (examExists) {
                foundCourseId = courseDoc.id;
                foundCourseName = courseData.name;
                foundExam = examExists;
                break;
            }
        }

        if (!foundCourseId || !foundCourseName || !foundExam) {
            return { success: false, error: "Exam not found in any course." };
        }

        if (foundExam.status === 'inactive') {
            return { success: false, error: "This exam is not currently active. Please contact an administrator." };
        }

        const isEnrolled = participant.enrolledCourses?.some(enrolledCourseName => 
            enrolledCourseName.toLowerCase() === foundCourseName?.toLowerCase()
        );

        if (!isEnrolled) {
            return { success: false, error: `You are not enrolled in the course required for this exam (${foundCourseName}).` };
        }
        
        const isAccessDenied = participant.deniedCourses?.includes(foundCourseId);
        if(isAccessDenied) {
             return { success: false, error: `Your access to the course for this exam has been revoked. Please contact an admin.` };
        }

        return { success: true, courseId: foundCourseId };

    } catch (error) {
        console.error("Error verifying exam access:", error);
        return { success: false, error: "A database error occurred during verification." };
    }
}


const saveExamProgressSchema = z.object({
    participantId: z.string().min(1),
    examId: z.string().min(1),
    answers: z.record(z.any()),
    startedAt: z.string().optional(),
});

export async function saveExamProgress(data: z.infer<typeof saveExamProgressSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = saveExamProgressSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { participantId, examId, answers, startedAt } = validated.data;
        const participantDocRef = doc(db, 'participants', participantId);

        const updateData: { [key: string]: any } = {
            [`examProgress.${examId}.answers`]: answers
        };

        if (startedAt) {
            const participantDoc = await getDoc(participantDocRef);
            const participantData = participantDoc.data() as Participant;
            // Only set startedAt if it doesn't exist
            if (!participantData.examProgress?.[examId]?.startedAt) {
                updateData[`examProgress.${examId}.startedAt`] = serverTimestamp();
            }
        }

        await updateDoc(participantDocRef, updateData);

        return { success: true };
    } catch(error) {
        console.error("Error saving exam progress:", error);
        return { success: false, error: "Could not save exam progress." };
    }
}


const submitExamSchema = z.object({
    participantId: z.string().min(1),
    courseId: z.string().min(1),
    examId: z.string().min(1),
    answers: z.record(z.any()),
});

export async function submitExam(data: z.infer<typeof submitExamSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = submitExamSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { participantId, courseId, examId, answers } = validated.data;

        // 1. Fetch exam questions to calculate score
        const course = await getCourseById(courseId);
        const exam = course?.exams?.find(e => e.id === examId);
        if (!exam) {
            return { success: false, error: "Exam could not be found." };
        }

        // 2. Calculate score
        let score = 0;
        for (const question of exam.questions) {
             if (question.type === 'paragraph') continue;

            const correctAnswers = question.correctAnswers || [(question as any).correctAnswer];
            const selectedAnswer = answers[question.id];

            if (question.type === 'checkbox') {
                 const correctSet = new Set(correctAnswers);
                 const selectedSet = new Set(Array.isArray(selectedAnswer) ? selectedAnswer : []);
                 if (correctSet.size === selectedSet.size && [...correctSet].every(val => selectedSet.has(val))) {
                    score++;
                }
            } else {
                if (Array.isArray(correctAnswers) && correctAnswers.includes(selectedAnswer)) {
                    score++;
                }
            }
        }
        
        // 3. Update participant's exam progress
        const participantDocRef = doc(db, 'participants', participantId);
        const fieldToUpdate = `examProgress.${examId}`;
        
        const participantDoc = await getDoc(participantDocRef);
        const participantData = participantDoc.data() as Participant;
        const attemptData = participantData.examProgress?.[examId] || {};


        await updateDoc(participantDocRef, {
            [fieldToUpdate]: {
                ...attemptData,
                answers,
                score,
                isSubmitted: true,
                submittedAt: serverTimestamp(),
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error submitting exam:", error);
        return { success: false, error: "Could not submit your exam due to a database error." };
    }
}


export async function getExamResults(examId: string): Promise<ExamResult[]> {
    try {
        const participantsCollection = collection(db, "participants");
        const q = query(participantsCollection, where(`examProgress.${examId}.isSubmitted`, "==", true));
        const snapshot = await getDocs(q);

        const results: ExamResult[] = [];

        if (snapshot.empty) {
            return [];
        }
        
        // Find the exam to get total questions
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        let exam: Exam | undefined;
        for (const courseDoc of coursesSnapshot.docs) {
             const courseExams = courseDoc.data().exams as Exam[] | undefined;
             exam = courseExams?.find(e => e.id === examId);
             if (exam) break;
        }
        
        const totalGradableQuestions = exam?.questions.filter(q => q.type !== 'paragraph').length || 0;


        snapshot.forEach(doc => {
            const p = doc.data() as Participant;
            const attempt = p.examProgress?.[examId];

            if (attempt && attempt.isSubmitted) {
                const submittedAtTimestamp = attempt.submittedAt as unknown as Timestamp;
                results.push({
                    participantId: doc.id,
                    participantName: p.name,
                    iitpNo: p.iitpNo,
                    score: attempt.score ?? 0,
                    totalQuestions: totalGradableQuestions,
                    submittedAt: submittedAtTimestamp?.toDate().toISOString() || new Date().toISOString(),
                });
            }
        });

        return results.sort((a, b) => b.score - a.score);

    } catch (error) {
        console.error("Error fetching exam results:", error);
        return [];
    }
}

const deleteExamAttemptSchema = z.object({
  participantId: z.string().min(1),
  examId: z.string().min(1),
});

export async function deleteExamAttempt(data: z.infer<typeof deleteExamAttemptSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = deleteExamAttemptSchema.safeParse(data);
    if (!validated.success) {
        return { success: false, error: "Invalid data" };
    }
    
    try {
        const { participantId, examId } = validated.data;
        const participantRef = doc(db, "participants", participantId);
        const participantSnap = await getDoc(participantRef);

        if (!participantSnap.exists()) {
            return { success: false, error: "Participant not found." };
        }
        
        const participantData = participantSnap.data();
        
        if (participantData.examProgress && participantData.examProgress[examId]) {
            delete participantData.examProgress[examId];
            await updateDoc(participantRef, {
                examProgress: participantData.examProgress
            });
        }
        
        return { success: true };

    } catch (error) {
        console.error("Error deleting exam attempt:", error);
        return { success: false, error: "Could not delete exam attempt." };
    }
}

// SITE SETTINGS
export async function getSiteConfig(): Promise<{ announcement: string, heroImageUrl: string }> {
    try {
        const docRef = doc(db, 'siteSettings', 'config');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                announcement: data.announcement || 'Welcome to the new training portal. All upcoming sessions and important notices will be posted here. Please check back regularly for updates.',
                heroImageUrl: data.heroImageUrl || 'https://bsagroup.in/wp-content/uploads/2024/12/about-updated-bsa-website-2048x435.png',
            };
        }
        return {
            announcement: 'Welcome to the new training portal. All upcoming sessions and important notices will be posted here. Please check back regularly for updates.',
            heroImageUrl: 'https://bsagroup.in/wp-content/uploads/2024/12/about-updated-bsa-website-2048x435.png',
        };
    } catch(error) {
        console.error("Error fetching site config:", error);
        return {
            announcement: 'Could not load announcement.',
            heroImageUrl: 'https://bsagroup.in/wp-content/uploads/2024/12/about-updated-bsa-website-2048x435.png',
        };
    }
}

export async function updateSiteConfig(data: { announcement?: string; heroImageUrl?: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const settingsDocRef = doc(db, 'siteSettings', 'config');
        await setDoc(settingsDocRef, data, { merge: true });
        return { success: true };
    } catch(error) {
        console.error("Error updating site config:", error);
        return { success: false, error: 'Could not update site configuration in the database.' };
    }
}

const createFormSchema = z.object({
  title: z.string().min(1, "Form title is required."),
  description: z.string().optional(),
  questions: z.array(z.object({
      id: z.string(),
      text: z.string().min(1, "Question text cannot be empty."),
      type: z.enum(['text', 'textarea', 'radio', 'checkbox', 'select']),
      options: z.array(z.string()).optional(),
      isRequired: z.boolean(),
  })).min(1, "At least one question is required."),
  createdBy: z.string().min(1),
});

export async function createForm(data: z.infer<typeof createFormSchema>): Promise<{ success: boolean; error?: string, formId?: string }> {
    const validated = createFormSchema.safeParse(data);
    if (!validated.success) {
        console.error("Form validation failed:", validated.error.flatten().fieldErrors);
        return { success: false, error: "Invalid form data provided." };
    }

    try {
        const formsCollection = collection(db, "forms");
        const docRef = await addDoc(formsCollection, {
            ...validated.data,
            createdAt: serverTimestamp(),
        });
        return { success: true, formId: docRef.id };
    } catch (error) {
        console.error("Error creating form:", error);
        return { success: false, error: "A database error occurred while creating the form." };
    }
}

export async function getFormsByCreator(creatorId: string): Promise<FormType[]> {
    try {
        const formsCollection = collection(db, "forms");
        const q = query(formsCollection, where("createdBy", "==", creatorId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: doc.id,
                title: data.title,
                description: data.description,
                questions: data.questions,
                createdBy: data.createdBy,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error("Error fetching forms:", error);
        return [];
    }
}
      
    

    












    

