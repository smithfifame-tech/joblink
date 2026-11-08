"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import { contactSchema } from "@/lib/validations/profile";
import { contactAction } from "@/lib/actions/contact";

type V = z.input<typeof contactSchema>;

export function ContactForm() {
  const { register, handleSubmit, reset, formState } = useForm<V>({ resolver: zodResolver(contactSchema), defaultValues: { website: "" } });
  async function onSubmit(v: V) {
    const res = await contactAction(v);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    reset();
  }
  const e = formState.errors;
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="name" label="Nom" required error={e.name?.message}><Input autoComplete="name" {...register("name")} /></FormField>
            <FormField id="email" label="E-mail" required error={e.email?.message}><Input type="email" autoComplete="email" {...register("email")} /></FormField>
          </div>
          <FormField id="subject" label="Sujet" required error={e.subject?.message}><Input {...register("subject")} /></FormField>
          <FormField id="message" label="Message" required error={e.message?.message}><Textarea rows={6} {...register("message")} /></FormField>
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...register("website")} />
          <Button type="submit" loading={formState.isSubmitting}>Envoyer</Button>
        </form>
      </CardContent>
    </Card>
  );
}
