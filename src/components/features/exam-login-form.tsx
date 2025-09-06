
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Library, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { verifyExamAccess } from "@/app/actions";

const formSchema = z.object({
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
});

type ExamLoginFormProps = {
  examId: string;
  onSuccess: (iitpNo: string, courseId: string) => void;
};

export function ExamLoginForm({ examId, onSuccess }: ExamLoginFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { iitpNo: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await verifyExamAccess({ ...values, examId });

      if (result.success && result.courseId) {
        toast({
            title: "Verification Successful!",
            description: "Redirecting you to the exam...",
        });
        onSuccess(values.iitpNo, result.courseId);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="iitpNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Library className="h-4 w-4" /> IITP No.
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter your unique ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
                Start Exam <Play className="ml-2" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
