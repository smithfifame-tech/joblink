"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, ImagePlus, MapPin, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { LocationPicker } from "@/components/maps/location-picker";
import { CityDatalist } from "@/components/layout/city-datalist";
import { jobSchema, todayISO, type JobInput } from "@/lib/validations/jobs";
import { validateFile, safeStorageName } from "@/lib/validations/profile";
import { addJobImagesAction, createJobAction, removeJobImageAction, updateJobAction } from "@/lib/actions/jobs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { COUNTRIES, findCity } from "@/lib/maps/places";
import { computeBreakdown } from "@/lib/payments/commission";
import { formatDate, formatXOF } from "@/lib/utils/format";
import { storagePublicUrl } from "@/lib/env";
import type { Category } from "@/types/db";
import { PAY_TYPE_LABEL } from "./status-badge";

interface ExistingImage { id: string; storage_path: string }

export function JobForm({
  categories,
  userId,
  jobId,
  initial,
  existingImages = [],
  canPublishDraft = true,
}: {
  categories: Category[];
  userId: string;
  jobId?: string;
  initial?: Partial<JobInput>;
  existingImages?: ExistingImage[];
  canPublishDraft?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState(existingImages);
  const [skillDraft, setSkillDraft] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      categoryId: "",
      description: "",
      skills: [],
      budget: "" as unknown as number,
      payType: "fixed",
      allowPriceProposal: false,
      startDate: todayISO(),
      deadline: "",
      country: "BJ",
      city: "",
      neighborhood: "",
      address: "",
      workMode: "on_site",
      lat: null,
      lng: null,
      workersNeeded: 1,
      intent: "publish",
      ...initial,
    },
  });
  const { register, control, watch, setValue, handleSubmit, formState, trigger, getValues } = form;
  const e = formState.errors;
  const v = watch();
  const category = categories.find((c) => c.id === v.categoryId);
  const budgetNumber = Number(String(v.budget ?? "").replace(/\s/g, ""));
  const breakdown = useMemo(() => {
    try {
      return Number.isInteger(budgetNumber) && budgetNumber > 0 ? computeBreakdown(budgetNumber) : null;
    } catch {
      return null;
    }
  }, [budgetNumber]);
  const previews = useMemo(() => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [files]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      const err = validateFile(f, "jobImage");
      if (err) {
        toast.error(`${f.name} : ${err}`);
        continue;
      }
      if (next.length + images.length >= 6) {
        toast.error("6 photos maximum.");
        break;
      }
      next.push(f);
    }
    setFiles(next);
  }

  function addSkill() {
    const s = skillDraft.trim();
    if (s.length < 2) return;
    const current = getValues("skills") ?? [];
    if (current.length >= 15 || current.includes(s)) return;
    setValue("skills", [...current, s], { shouldValidate: true });
    setSkillDraft("");
  }

  async function uploadImages(id: string): Promise<boolean> {
    if (!files.length) return true;
    const supabase = getSupabaseBrowserClient();
    const paths: string[] = [];
    for (const f of files) {
      const path = `${userId}/${id}/${safeStorageName(f.name, f.type)}`;
      const { error } = await supabase.storage.from("job-images").upload(path, f, { contentType: f.type, upsert: false, cacheControl: "31536000" });
      if (error) {
        toast.error(`Échec de l'envoi de ${f.name}`);
        continue;
      }
      paths.push(path);
    }
    const res = await addJobImagesAction(id, paths);
    if (!res.ok) toast.error(res.error);
    return res.ok;
  }

  async function submit(intent: "publish" | "draft") {
    setServerError(null);
    setValue("intent", intent);
    await handleSubmit(async (values) => {
      const payload = { ...values, intent };
      const res = jobId ? await updateJobAction(jobId, payload) : await createJobAction(payload);
      if (!res.ok) {
        setServerError(res.error);
        setStep("edit");
        for (const [k, msgs] of Object.entries(res.fieldErrors ?? {})) {
          if (msgs?.[0]) form.setError(k as keyof JobInput, { message: msgs[0] });
        }
        return;
      }
      await uploadImages(res.data.id);
      toast.success(intent === "draft" ? "Brouillon enregistré." : jobId ? "Mission mise à jour." : "Mission publiée !");
      router.push(`/client/jobs/${res.data.id}`);
      router.refresh();
    }, () => {
      setStep("edit");
      toast.error("Certains champs sont à corriger.");
    })();
  }

  async function goPreview() {
    const ok = await trigger();
    if (!ok) return toast.error("Complétez les champs obligatoires avant la prévisualisation.");
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (step === "preview") {
    return (
      <div className="grid gap-6">
        <Alert variant="info" title="Prévisualisation">Voici votre annonce telle que les travailleurs la verront. L&apos;adresse exacte reste privée.</Alert>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              {category && <Badge variant="secondary">{category.name}</Badge>}
              <Badge variant="outline">{v.workMode === "remote" ? "À distance" : "Sur place"}</Badge>
              {Number(v.workersNeeded) > 1 && <Badge variant="outline">{String(v.workersNeeded)} personnes</Badge>}
            </div>
            <CardTitle className="text-xl">{v.title}</CardTitle>
            <CardDescription>
              {v.workMode === "remote" ? "À distance" : `${v.neighborhood}, ${v.city}`} · Du {formatDate(v.startDate)} au {formatDate(v.deadline)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-2xl font-semibold text-primary-strong">
              {formatXOF(budgetNumber)} {v.payType !== "fixed" && <span className="text-sm font-normal text-muted-foreground">{PAY_TYPE_LABEL[v.payType ?? "fixed"]}</span>}
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed">{v.description}</p>
            {(v.skills ?? []).length > 0 && <div className="flex flex-wrap gap-2">{(v.skills ?? []).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>}
            {(previews.length > 0 || images.length > 0) && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {images.map((img) => <Image key={img.id} src={storagePublicUrl("job-images", img.storage_path) ?? ""} alt="" width={120} height={90} className="aspect-[4/3] rounded-lg object-cover" />)}
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant envoi */}
                {previews.map((p) => <img key={p.url} src={p.url} alt="" className="aspect-[4/3] rounded-lg object-cover" />)}
              </div>
            )}
            {breakdown && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Lors du paiement : le travailleur recevra {formatXOF(breakdown.net)} (commission JOBLINK de 5 % = {formatXOF(breakdown.commission)}), avant éventuels frais du prestataire de paiement, affichés avant validation.
              </p>
            )}
          </CardContent>
        </Card>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setStep("edit")}><ArrowLeft /> Modifier</Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canPublishDraft && <Button variant="secondary" onClick={() => submit("draft")} loading={formState.isSubmitting}><Save /> Enregistrer en brouillon</Button>}
            <Button size="lg" onClick={() => submit("publish")} loading={formState.isSubmitting}><Send /> {jobId ? "Enregistrer" : "Publier la mission"}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="grid gap-6" noValidate onSubmit={(ev) => { ev.preventDefault(); void goPreview(); }}>
      <CityDatalist />
      {serverError && <Alert variant="error">{serverError}</Alert>}

      <Card>
        <CardHeader><CardTitle>La mission</CardTitle><CardDescription>Les champs marqués * sont obligatoires.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <FormField id="title" label="Titre de la mission" required error={e.title?.message} hint="Ex. « Réparer une fuite sous l'évier de la cuisine »">
            <Input maxLength={120} {...register("title")} />
          </FormField>
          <FormField id="categoryId" label="Catégorie" required error={e.categoryId?.message}>
            <NativeSelect {...register("categoryId")}>
              <option value="">Choisir une catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </FormField>
          <FormField id="description" label="Description détaillée" required error={e.description?.message} hint="Travail attendu, matériel fourni ou non, contraintes d'accès, horaires…">
            <Textarea rows={7} maxLength={5000} {...register("description")} />
          </FormField>
          <div className="grid gap-1.5">
            <Label htmlFor="skill-input">Compétences recherchées</Label>
            <div className="flex gap-2">
              <Input id="skill-input" value={skillDraft} onChange={(ev) => setSkillDraft(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addSkill(); } }} placeholder="Ex. Carrelage — puis Entrée" maxLength={60} />
              <Button type="button" variant="outline" onClick={addSkill}>Ajouter</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(v.skills ?? []).map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 pr-1">
                  {s}
                  <button type="button" className="rounded-full p-0.5 hover:bg-background" aria-label={`Retirer ${s}`} onClick={() => setValue("skills", (v.skills ?? []).filter((x) => x !== s))}><X /></button>
                </Badge>
              ))}
            </div>
            {e.skills && <p className="text-xs text-destructive">{e.skills.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Budget et calendrier</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="budget" label="Budget (FCFA)" required error={e.budget?.message}>
            <Input inputMode="numeric" placeholder="10000" {...register("budget")} />
          </FormField>
          <FormField id="payType" label="Type de rémunération" required error={e.payType?.message}>
            <NativeSelect {...register("payType")}>
              <option value="fixed">Forfait (prix total)</option>
              <option value="hourly">Par heure</option>
              <option value="daily">Par jour</option>
            </NativeSelect>
          </FormField>
          <FormField id="startDate" label="Date de début souhaitée" required error={e.startDate?.message}>
            <Input type="date" min={todayISO()} {...register("startDate")} />
          </FormField>
          <FormField id="deadline" label="Date limite" required error={e.deadline?.message}>
            <Input type="date" min={v.startDate || todayISO()} {...register("deadline")} />
          </FormField>
          <FormField id="workersNeeded" label="Nombre de travailleurs recherchés" required error={e.workersNeeded?.message}>
            <Input type="number" min={1} max={50} inputMode="numeric" {...register("workersNeeded")} />
          </FormField>
          <Controller control={control} name="allowPriceProposal" render={({ field }) => (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:self-end">
              <Label htmlFor="allowPriceProposal" className="font-normal">Accepter des propositions de prix</Label>
              <Switch id="allowPriceProposal" checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )} />
          {breakdown && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Commission JOBLINK (5 %) : {formatXOF(breakdown.commission)} · Le travailleur recevra {formatXOF(breakdown.net)} avant frais éventuels du prestataire de paiement.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lieu</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Controller control={control} name="workMode" render={({ field }) => (
            <div role="radiogroup" aria-label="Mode de réalisation" className="grid grid-cols-2 gap-2">
              {[["on_site", "Sur place"], ["remote", "À distance"]].map(([val, label]) => (
                <label key={val} className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25 ${field.value === val ? "border-primary bg-accent/60 text-accent-foreground" : ""}`}>
                  <input type="radio" className="sr-only" checked={field.value === val} onChange={() => field.onChange(val)} /> {label}
                </label>
              ))}
            </div>
          )} />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="country" label="Pays" required error={e.country?.message}>
              <NativeSelect {...register("country")}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code} disabled={!c.enabled}>{c.name}</option>)}
              </NativeSelect>
            </FormField>
            <FormField id="city" label="Ville" required error={e.city?.message}>
              <Input list="jl-cities" {...register("city", { onBlur: (ev) => { const c = findCity(ev.target.value); if (c && getValues("lat") === null && getValues("workMode") === "on_site") { setValue("lat", c.lat); setValue("lng", c.lng); } } })} />
            </FormField>
            <FormField id="neighborhood" label="Quartier" required error={e.neighborhood?.message}><Input {...register("neighborhood")} /></FormField>
          </div>
          {v.workMode === "on_site" && (
            <>
              <FormField id="address" label="Adresse ou point de rencontre" error={e.address?.message} hint="Visible uniquement par le travailleur retenu.">
                <Input maxLength={300} {...register("address")} />
              </FormField>
              <div className="grid gap-1.5">
                <p className="flex items-center gap-1 text-sm font-medium"><MapPin className="size-4" /> Localisation sur la carte <span className="text-destructive">*</span></p>
                <LocationPicker
                  value={v.lat !== null && v.lat !== undefined && v.lng !== null && v.lng !== undefined ? { lat: v.lat, lng: v.lng } : null}
                  onChange={(p) => { setValue("lat", p.lat, { shouldValidate: true }); setValue("lng", p.lng, { shouldValidate: true }); }}
                />
                {e.lat && <p role="alert" className="text-xs font-medium text-destructive">{e.lat.message}</p>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Photos</CardTitle><CardDescription>Facultatif · 6 photos maximum · JPG, PNG ou WebP, 5 Mo max chacune.</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {images.map((img) => (
              <div key={img.id} className="group relative">
                <Image src={storagePublicUrl("job-images", img.storage_path) ?? ""} alt="" width={120} height={90} className="aspect-[4/3] w-full rounded-lg object-cover" />
                {jobId && (
                  <button type="button" aria-label="Supprimer la photo" className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white" onClick={async () => {
                    const res = await removeJobImageAction(img.id, jobId);
                    if (res.ok) setImages(images.filter((i) => i.id !== img.id));
                    else toast.error(res.error);
                  }}><Trash2 className="size-3.5" /></button>
                )}
              </div>
            ))}
            {previews.map((p, i) => (
              <div key={p.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant envoi */}
                <img src={p.url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <button type="button" aria-label="Retirer" className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="size-3.5" /></button>
              </div>
            ))}
            {images.length + files.length < 6 && (
              <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <ImagePlus className="size-5" />
                <span className="sr-only">Ajouter des photos</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(ev) => { addFiles(ev.target.files); ev.target.value = ""; }} />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {canPublishDraft && <Button type="button" variant="secondary" onClick={() => submit("draft")} loading={formState.isSubmitting}><Save /> Brouillon</Button>}
        <Button type="submit" size="lg"><Eye /> Prévisualiser</Button>
      </div>
    </form>
  );
}
