
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc, addDoc, orderBy, deleteDoc, updateDoc, where, arrayUnion, arrayRemove } from "firebase/firestore";
import type { Registration, Batch, MeetingLinks, Participant, Trainer, Course, Subject, Unit, Lesson } from "@/lib/types";

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
        
        // Create a registration record for this batch using the participant's data
        const registrationData = {
          name: participant.name,
          iitpNo: participant.iitpNo,
          mobile: participant.mobile || '',
          organization: participant.organization || '',
          submissionTime: serverTimestamp(),
        };

        const registrationsCollection = collection(db, `batches/${batchId}/registrations`);
        await addDoc(registrationsCollection, registrationData);

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
        };
    } catch (error) {
        console.error('Error fetching batch by ID:', error);
        return null;
    }
}


export async function updateBatch(batchId: string, data: Partial<Pick<Batch, 'name' | 'course' | 'startDate' | 'startTime' | 'endTime' | 'trainerId'>>): Promise<{success: boolean, error?: string}> {
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
            trainerId: data.trainerId
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
  course: z.enum(['Diploma', 'Advance Diploma', 'Other']),
  startDate: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  trainerId: z.string().min(1, "A trainer must be selected."),
});

export async function createBatch(data: z.infer<typeof createBatchSchema>): Promise<{success: boolean, error?: string}> {
    const validatedFields = createBatchSchema.safeParse(data);
    if(!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid form data."};
    }

    try {
        const { name, course, startDate, startTime, endTime, trainerId } = validatedFields.data;
        const batchesCollection = collection(db, "batches");
        await addDoc(batchesCollection, {
            name,
            course,
            startDate: Timestamp.fromDate(startDate),
            startTime,
            endTime,
            trainerId,
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
            return {
                id: doc.id,
                name: data.name,
                iitpNo: data.iitpNo,
                mobile: data.mobile,
                organization: data.organization,
                createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
                enrolledCourses: data.enrolledCourses || [], 
                completedLessons: data.completedLessons || [],
            };
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

        return {
            id: participantDoc.id,
            name: data.name,
            iitpNo: data.iitpNo,
            mobile: data.mobile,
            organization: data.organization,
            createdAt: createdAt?.toDate().toISOString() || new Date().toISOString(),
            enrolledCourses: data.enrolledCourses || [],
            completedLessons: data.completedLessons || [],
        };
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

export async function addParticipantsInBulk(participants: Omit<Participant, 'id' | 'createdAt' | 'completedLessons'>[]): Promise<{ success: boolean; error?: string, skippedCount?: number }> {
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

// TRAINER ACTIONS
const trainerSchema = z.object({
  name: z.string().min(2, "Trainer name must be at least 2 characters."),
  meetingLink: z.string().url("Must be a valid meeting URL."),
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
                meetingLink: data.meetingLink,
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
        return { success: false, error: "Invalid trainer data." };
    }
    
    try {
        const trainersCollection = collection(db, "trainers");
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
        return { success: false, error: "Invalid trainer data." };
    }
    
    try {
        const trainerDocRef = doc(db, 'trainers', id);
        await updateDoc(trainerDocRef, validatedFields.data);
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
    const diplomaDocRef = doc(coursesCollectionRef, 'diploma');
    const advDiplomaDocRef = doc(coursesCollectionRef, 'advance-diploma');

    const diplomaDoc = await getDoc(diplomaDocRef);
    const advDiplomaDoc = await getDoc(advDiplomaDocRef);

    const batch = writeBatch(db);

    if (!diplomaDoc.exists()) {
        batch.set(diplomaDocRef, { name: 'Diploma', subjects: [] });
    }
    if (!advDiplomaDoc.exists()) {
        batch.set(advDiplomaDocRef, { name: 'Advance Diploma', subjects: [] });
    }

    await batch.commit();
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

            courses.push({
                id: courseDoc.id,
                name: courseData.name,
                subjects: subjects.sort((a, b) => a.name.localeCompare(b.name)),
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

        return {
            id: courseDoc.id,
            name: courseData.name,
            subjects: subjects.sort((a, b) => a.name.localeCompare(b.name)),
        };
    } catch (error) {
        console.error("Error fetching course by ID:", error);
        return null;
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
    duration: z.number().optional(),
});

export async function addLesson(data: z.infer<typeof lessonSchema>): Promise<{ success: boolean; error?: string }> {
    const validated = lessonSchema.safeParse(data);
    if (!validated.success) {
      console.log(validated.error.flatten().fieldErrors);
      return { success: false, error: "Invalid data." };
    }

    try {
        const { courseId, subjectId, unitId, lessonTitle, videoUrl, duration } = validated.data;
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
    if (!validated.success) return { success: false, error: "Invalid data." };

    try {
        const { courseId, subjectId, unitId, lessonId, lessonTitle, videoUrl, duration } = validated.data;
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
