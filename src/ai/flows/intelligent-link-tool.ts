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
  email: z.string().email().describe('The email of the user.'),
  registrationData: z
    .string()
    .describe('Additional registration data provided by the user.'),
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
  Email: {{{email}}}
  Registration Data: {{{registrationData}}}

  Based on this information, provide the most relevant meeting link. Return only the link, and ensure it is a valid URL.
  Consider factors like the user's role, interests, and any specific session preferences indicated in their registration data.
  If no specific session is indicated, provide the default meeting link.

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
