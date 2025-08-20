'use server';

/**
 * @fileOverview An AI agent that intelligently determines the appropriate meeting link based on registration data.
 *
 * - intelligentLinkTool - A function that handles the meeting link determination process.
 * - IntelligentLinkToolInput - The input type for the intelligentLinkTool function.
 * - IntelligentLinkToolOutput - The return type for the intelligentLinkTool function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentLinkToolInputSchema = z.object({
  name: z.string().describe('The name of the user.'),
  iitpNo: z.string().describe("The user's IITP Number."),
  organization: z.string().describe('The organization the user belongs to.'),
  existingRegistrations: z.array(z.object({
    name: z.string(),
    iitpNo: z.string(),
    organization: z.string(),
    meetingLink: z.string(),
    submissionTime: z.string(),
  })).describe('An array of existing registrations to check for a custom meeting link.')
});
export type IntelligentLinkToolInput = z.infer<typeof IntelligentLinkToolInputSchema>;

const IntelligentLinkToolOutputSchema = z.object({
  meetingLink: z.string().url().describe('The appropriate meeting link for the user.'),
});
export type IntelligentLinkToolOutput = z.infer<typeof IntelligentLinkToolOutputSchema>;

export async function intelligentLinkTool(input: IntelligentLinkToolInput): Promise<IntelligentLinkToolOutput> {
  return intelligentLinkToolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'intelligentLinkToolPrompt',
  input: {schema: IntelligentLinkToolInputSchema},
  output: {schema: IntelligentLinkToolOutputSchema},
  prompt: `You are an AI assistant designed to determine the most appropriate meeting link for a user based on their registration data.

  You will be given the new user's registration data and a list of existing registrations.
  Your primary goal is to check if a custom meeting link has already been set for the user's organization in the existing registrations. A custom link is any link that is not 'https://meet.google.com/default'.

  1. Find the most recent registration from the 'existingRegistrations' list that matches the new user's 'organization'.
  2. If a matching registration is found and its 'meetingLink' is not the default link ('https://meet.google.com/default'), use that meeting link.
  3. If no registration for that organization exists, or if all existing registrations for that organization use the default link, then determine the link based on the organization name.

  - If the organization is "TE Connectivity, Shirwal", provide the link https://meet.google.com/shirwal.
  - If the organization is "BSA Plant, Chakan", provide the link https://meet.google.com/chakan.
  - If the organization is "Belden India", provide the link https://meet.google.com/belden.
  - Otherwise, provide the default meeting link: https://meet.google.com/default.

  New User Information:
  Name: {{{name}}}
  IITP No: {{{iitpNo}}}
  Organization: {{{organization}}}

  Existing Registrations:
  {{#each existingRegistrations}}
  - Name: {{this.name}}, Organization: {{this.organization}}, Link: {{this.meetingLink}}, Time: {{this.submissionTime}}
  {{/each}}

  Analyze the information and provide only the final, most appropriate meeting link in the specified JSON format.
  `,
});

const intelligentLinkToolFlow = ai.defineFlow(
  {
    name: 'intelligentLinkToolFlow',
    inputSchema: IntelligentLinkToolInputSchema,
    outputSchema: IntelligentLinkToolOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
