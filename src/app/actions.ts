"use server";

import { z } from "zod";
import { intelligentLinkTool } from "@/ai/flows/intelligent-link-tool";
import type { Registration } from "@/lib/types";

const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  registrationData: z.string().min(10, { message: "Please provide some details about your registration (min. 10 characters)." }).max(500, { message: "Details can be up to 500 characters."}),
});

export async function registerForMeeting(
  data: z.infer<typeof registrationSchema>
): Promise<{ success: true; registration: Registration } | { success: false; error: string }> {
  const validatedFields = registrationSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, error: "Invalid form data." };
  }

  try {
    const result = await intelligentLinkTool(validatedFields.data);
    const newRegistration: Registration = {
      ...validatedFields.data,
      meetingLink: result.meetingLink,
    };
    return { success: true, registration: newRegistration };
  } catch (error) {
    console.error("Error calling intelligentLinkTool:", error);
    return { success: false, error: "Failed to generate a meeting link. Please try again." };
  }
}
