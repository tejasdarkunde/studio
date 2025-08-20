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

  Analyze the following information to select the best meeting link:

  Name: {{{name}}}
  IITP No: {{{iitpNo}}}
  Organization: {{{organization}}}

  Based on this information, provide the most relevant meeting link. Return only the link, and ensure it is a valid URL.
  If the organization is "TE Connectivity, Shirwal", provide the link https://meet.google.com/shirwal.
  If the organization is "BSA Plant, Chakan", provide the link https://meet.google.com/chakan.
  If the organization is "Belden India", provide the link https://meet.google.com/belden.
  Otherwise, provide the default meeting link: https://meet.google.com/default.

  Output the meeting link in the following format:
  {
    "meetingLink": "https://example.com/meeting"
  }`,
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
