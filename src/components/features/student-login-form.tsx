
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Library, Lock, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { studentLogin } from "@/app/actions";

const formSchema = z.object({
  iitpNo: z.string().min(1, { message: "IITP No. is required." }),
  passkey: z.string().min(1, { message: "Passkey is required." }),
});

type StudentLoginFormProps = {
  onSuccess: (iitpNo: string) => void;
};

export function StudentLoginForm({ onSuccess }: StudentLoginFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      iitpNo: "",
      passkey: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await studentLogin(values);

      if (result.success && result.iitpNo) {
        onSuccess(result.iitpNo);
        form.reset();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
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
         <FormField
          control={form.control}
          name="passkey"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Passkey (Registered Mobile No.)
              </FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your passkey" {...field} />
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
                Login <LogIn className="ml-2" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

    