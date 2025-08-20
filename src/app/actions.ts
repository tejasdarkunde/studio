"use server";

import { z } from "zod";
import { intelligentLinkTool } from "@/ai/flows/intelligent-link-tool";
import type { Registration } from "@/lib/types";

const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  organization: z.string({
    required_error: "Please select an organization.",
  }),
});

const actionSchema = z.object({
  form: registrationSchema,
  existingRegistrations: z.array(z.object({
    name: z.string(),
    iitpNo: z.string(),
    organization: z.string(),
    meetingLink: z.string(),
    submissionTime: z.string().or(z.date()),
  })),
});


export async function registerForMeeting(
  data: z.infer<typeof actionSchema>
): Promise<{ success: true; registration: Registration } | { success: false; error: string }> {
  const validatedFields = registrationSchema.safeParse(data.form);

  if (!validatedFields.success) {
    return { success: false, error: "Invalid form data." };
  }
  
  const serializableRegistrations = data.existingRegistrations.map(reg => ({
    ...reg,
    submissionTime: new Date(reg.submissionTime).toISOString(),
  }));

  try {
    const result = await intelligentLinkTool({
        ...validatedFields.data,
        existingRegistrations: serializableRegistrations
    });
    const newRegistration: Registration = {
      ...validatedFields.data,
      meetingLink: result.meetingLink,
      submissionTime: new Date(),
    };
    return { success: true, registration: newRegistration };
  } catch (error) {
    console.error("Error calling intelligentLinkTool:", error);
    return { success: false, error: "Failed to generate a meeting link. Please try again." };
  }
}
