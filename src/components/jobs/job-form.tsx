"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Check, ChevronDown, Eye, ImagePlus, Lightbulb, MapPin, Save, Send, ShieldCheck, Trash2, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { LocationPicker } from "@/components/maps/location-picker";
import { CityDatalist } from "@/components/layout/city-datalist";
import { CategoryIcon } from "@/components/layout/category-icon";
import { jobSchema, todayISO, type JobInput } from "@/lib/validations/jobs";
import { validateFile, safeStorageName } from "@/lib/validations/profile";
import { addJobImagesAction, createJobAction, removeJobImageAction, updateJobAction } from "@/lib/actions/jobs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { COUNTRIES, findCity } from "@/lib/maps/places";
import { computeBreakdown, DEFAULT_COMMISSION_RATE, formatRate } from "@/lib/payments/commission";
import { categoryPhoto, TITLE_IDEAS } from "@/lib/media/category-photos";
import { jobQuality } from "@/lib/jobs/signals";
import { formatXOF } from "@/lib/utils/format";
import { storagePublicUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/db";
import { PAY_TYPE_LABEL } from "./status-badge";
import { JobHero } from "./job-hero";
import { JobCard } from "./job-card";

interface ExistingImage { id: string; storage_path: string }

const VISIBLE_CATEGORIES = 8;

function Section({ n, title, description, done, optional, children }: {
  n: number;
  title: string;
  description?: string;
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors duration-300",
            done ? "bg-primary text-white" : "bg-accent text-primary-strong",
          )}
        >
          {done ? <Check className="size-4" /> : n}
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {title} {optional && <span className="text-xs font-medium text-muted-foreground">· facultatif</span>}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function QualityMeter({ score, level, tips }: { score: number; level: string; tips: string[] }) {
  const color = score >= 80 ? "bg-primary" : score >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="size-4 text-primary" /> Qualité de l&apos;annonce</p>
        <span className="text-sm font-bold tabular-nums">{score}/100</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Qualité de l'annonce">
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", color)} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Annonce <strong className="text-foreground">{level}</strong>
        {score >= 80 ? " : elle a tout pour attirer de bons profils." : "."}
      </p>
      {tips.length > 0 && (
        <ul className="mt-3 grid gap-1.5">
          {tips.map((t) => (
            <li key={t} className="flex gap-1.5 text-xs text-muted-foreground"><Lightbulb className="mt-px size-3.5 shrink-0 text-amber-500" /> {t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function JobForm({
  categories,
  userId,
  jobId,
  initial,
  existingImages = [],
  canPublishDraft = true,
  commissionRate = DEFAULT_COMMISSION_RATE,
}: {
  categories: Category[];
  userId: string;
  jobId?: string;
  initial?: Partial<JobInput>;
  existingImages?: ExistingImage[];
  canPublishDraft?: boolean;
  /** Taux réellement appliqué (platform_settings), passé par la page serveur. */
  commissionRate?: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState(existingImages);
  const [skillDraft, setSkillDraft] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState(false);

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
      return Number.isInteger(budgetNumber) && budgetNumber > 0 ? computeBreakdown(budgetNumber, commissionRate) : null;
    } catch {
      return null;
    }
  }, [budgetNumber, commissionRate]);
  const previews = useMemo(() => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [files]);

  // Image de l'annonce : 1re photo ajoutée, sinon photo existante, sinon illustration de la catégorie.
  const illus = categoryPhoto(category?.slug, category?.icon);
  const firstExisting = images[0] ? storagePublicUrl("job-images", images[0].storage_path) : null;
  const cover = previews[0]
    ? { src: previews[0].url, illustration: false }
    : firstExisting
      ? { src: firstExisting, illustration: false }
      : { src: illus.src, illustration: true, alt: illus.alt, credit: { author: illus.author, url: illus.authorUrl } };

  const located = v.workMode === "remote" || (v.lat !== null && v.lat !== undefined);
  const done = {
    mission: (v.title ?? "").trim().length >= 5 && Boolean(v.categoryId) && (v.description ?? "").trim().length >= 30,
    budget: budgetNumber > 0 && Boolean(v.deadline) && Boolean(v.startDate),
    place: Boolean(v.city) && Boolean(v.neighborhood) && located,
    photos: images.length + files.length > 0,
  };
  const quality = jobQuality({
    title: v.title,
    categoryId: v.categoryId,
    description: v.description,
    skills: v.skills,
    budget: budgetNumber,
    deadline: v.deadline,
    photos: images.length + files.length,
    located,
  });
  const place = v.workMode === "remote" ? "À distance" : [v.neighborhood, v.city].filter(Boolean).join(", ") || "Votre quartier";

  const selectedIndex = categories.findIndex((c) => c.id === v.categoryId);
  const shownCategories = allCategories || selectedIndex >= VISIBLE_CATEGORIES ? categories : categories.slice(0, VISIBLE_CATEGORIES);
  const ideas = category ? TITLE_IDEAS[category.slug] ?? [] : [];

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
      const published = intent === "publish" && !jobId;
      toast.success(intent === "draft" ? "Brouillon enregistré." : jobId ? "Mission mise à jour." : "Mission publiée !");
      router.push(`/client/jobs/${res.data.id}${published ? "?published=1" : ""}`);
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

  const heroProps = {
    cover,
    categoryName: category?.name,
    categoryIcon: category?.icon,
    title: v.title,
    place,
    remote: v.workMode === "remote",
    startDate: v.startDate,
    deadline: v.deadline || undefined,
    workersNeeded: Number(v.workersNeeded) || 1,
    unoptimized: cover.src.startsWith("blob:"),
    headingLevel: "h2" as const,
  };

  /* ───────────── Prévisualisation ───────────── */
  if (step === "preview") {
    return (
      <div className="grid gap-6">
        <JobHero {...heroProps} createdAt={new Date().toISOString()} priority aside={<span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">Aperçu</span>} />
        <Alert variant="info" title="Vérifiez votre annonce">Voici ce que verront les travailleurs. L&apos;adresse exacte reste privée jusqu&apos;au choix du travailleur.</Alert>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid content-start gap-6 rounded-[1.5rem] border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <section>
              <h2 className="text-lg font-bold">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{v.description}</p>
            </section>
            {(v.skills ?? []).length > 0 && (
              <section>
                <h2 className="text-lg font-bold">Compétences recherchées</h2>
                <div className="mt-2 flex flex-wrap gap-2">{(v.skills ?? []).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
              </section>
            )}
            {(previews.length > 0 || images.length > 0) && (
              <section>
                <h2 className="text-lg font-bold">Photos</h2>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((img) => <Image key={img.id} src={storagePublicUrl("job-images", img.storage_path) ?? ""} alt="" width={160} height={120} className="aspect-[4/3] w-full rounded-xl object-cover" />)}
                  {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant envoi */}
                  {previews.map((p) => <img key={p.url} src={p.url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />)}
                </div>
              </section>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <div className="overflow-hidden rounded-[1.5rem] bg-primary-strong p-5 text-white shadow-[var(--shadow-lift)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Budget</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">
                {formatXOF(budgetNumber)}
                {v.payType !== "fixed" && <span className="text-sm font-medium text-white/70"> {PAY_TYPE_LABEL[v.payType ?? "fixed"]}</span>}
              </p>
              {v.allowPriceProposal && <p className="mt-1 text-xs text-white/75">Propositions de prix acceptées.</p>}
              {breakdown && (
                <dl className="mt-4 grid gap-1.5 border-t border-dashed border-white/25 pt-4 text-sm">
                  <div className="flex justify-between"><dt className="text-white/75">Commission JOBLINK ({formatRate(commissionRate)})</dt><dd className="tabular-nums">{formatXOF(breakdown.commission)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Le travailleur reçoit</dt><dd className="tabular-nums">{formatXOF(breakdown.net)}</dd></div>
                </dl>
              )}
              <p className="mt-4 flex gap-1.5 text-[11px] leading-relaxed text-white/70">
                <ShieldCheck className="mt-px size-3.5 shrink-0" /> Vous ne payez qu&apos;après validation du travail, avant éventuels frais du prestataire de paiement affichés au moment du paiement.
              </p>
            </div>
          </aside>
        </div>

        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-2xl border bg-white/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setStep("edit")}><ArrowLeft /> Modifier</Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canPublishDraft && <Button variant="secondary" onClick={() => submit("draft")} loading={formState.isSubmitting}><Save /> Enregistrer en brouillon</Button>}
            <Button size="lg" onClick={() => submit("publish")} loading={formState.isSubmitting} className="shadow-[0_10px_24px_-8px_rgb(22_163_74/0.6)]"><Send /> {jobId ? "Enregistrer" : "Publier la mission"}</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────── Édition ───────────── */
  const steps = [
    { label: "Mission", ok: done.mission },
    { label: "Budget", ok: done.budget },
    { label: "Lieu", ok: done.place },
    { label: "Photos", ok: done.photos },
  ];

  return (
    <form className="grid gap-6" noValidate onSubmit={(ev) => { ev.preventDefault(); void goPreview(); }}>
      <CityDatalist />

      <JobHero {...heroProps} className="[&_h2]:text-xl sm:[&_h2]:text-3xl">
        <ol className="flex flex-wrap gap-2" aria-label="Progression">
          {steps.map((s, i) => (
            <li
              key={s.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors duration-300",
                s.ok ? "bg-white text-primary-strong ring-white" : "bg-white/10 text-white/85 ring-white/25",
              )}
            >
              {s.ok ? <Check className="size-3.5" /> : <span className="tabular-nums">{i + 1}</span>} {s.label}
            </li>
          ))}
        </ol>
      </JobHero>

      {serverError && <Alert variant="error">{serverError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-6">
          <Section n={1} title="La mission" description="Choisissez le métier et décrivez le travail." done={done.mission}>
            <div className="grid gap-5">
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">Catégorie <span className="text-destructive" aria-hidden>*</span></legend>
                    <div role="radiogroup" aria-label="Catégorie" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {shownCategories.map((c) => {
                        const photo = categoryPhoto(c.slug, c.icon);
                        const checked = field.value === c.id;
                        return (
                          <label
                            key={c.id}
                            className={cn(
                              "group relative isolate flex aspect-[4/3] cursor-pointer flex-col justify-end overflow-hidden rounded-2xl p-2.5 text-white transition-all duration-300 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/40",
                              checked ? "ring-[3px] ring-primary ring-offset-2" : "hover:-translate-y-0.5",
                            )}
                          >
                            <input type="radio" className="sr-only" name={field.name} value={c.id} checked={checked} onChange={() => field.onChange(c.id)} onBlur={field.onBlur} />
                            <Image src={photo.src} alt="" fill sizes="(min-width: 640px) 180px, 45vw" className="-z-20 object-cover transition-transform duration-500 group-hover:scale-110" />
                            <span aria-hidden className={cn("absolute inset-0 -z-10 transition-colors duration-300", checked ? "bg-gradient-to-t from-primary-strong/95 via-primary-strong/50 to-primary/10" : "bg-gradient-to-t from-black/80 via-black/30 to-transparent")} />
                            {checked && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white text-primary shadow"><Check className="size-3.5" /></span>}
                            <span className="flex items-center gap-1.5">
                              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur"><CategoryIcon name={c.icon} className="size-3.5" /></span>
                              <span className="line-clamp-2 text-xs font-bold leading-tight">{c.name}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {categories.length > VISIBLE_CATEGORIES && selectedIndex < VISIBLE_CATEGORIES && (
                      <button type="button" onClick={() => setAllCategories((x) => !x)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-strong hover:underline">
                        {allCategories ? "Moins de catégories" : `Voir les ${categories.length} catégories`}
                        <ChevronDown className={cn("size-4 transition-transform", allCategories && "rotate-180")} />
                      </button>
                    )}
                    {e.categoryId && <p role="alert" className="mt-2 text-xs font-medium text-destructive">{e.categoryId.message}</p>}
                  </fieldset>
                )}
              />

              <FormField id="title" label="Titre de la mission" required error={e.title?.message} hint="Ex. « Réparer une fuite sous l'évier de la cuisine »">
                <Input maxLength={120} {...register("title")} />
              </FormField>
              {ideas.length > 0 && (
                <div className="-mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Lightbulb className="size-3.5 text-amber-500" /> Idées :</span>
                  {ideas.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setValue("title", idea, { shouldValidate: true, shouldDirty: true })}
                      className="rounded-full border border-dashed border-primary/40 bg-accent/50 px-2.5 py-1 text-xs font-medium text-primary-strong transition-colors hover:border-primary hover:bg-accent"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              )}

              <FormField id="description" label="Description détaillée" required error={e.description?.message} hint={`Travail attendu, matériel fourni ou non, contraintes d'accès, horaires… · ${(v.description ?? "").length}/5000`}>
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
            </div>
          </Section>

          <Section n={2} title="Budget et calendrier" description="Un budget réaliste attire des candidatures sérieuses." done={done.budget}>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="flex items-center justify-between gap-3 rounded-xl border p-3 sm:self-end">
                  <Label htmlFor="allowPriceProposal" className="font-normal">Accepter des propositions de prix</Label>
                  <Switch id="allowPriceProposal" checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )} />
              {breakdown && (
                <div className="grid gap-1 rounded-xl bg-accent/60 p-3 text-xs text-accent-foreground sm:col-span-2">
                  <p className="flex justify-between"><span>Commission JOBLINK ({formatRate(commissionRate)})</span><strong className="tabular-nums">{formatXOF(breakdown.commission)}</strong></p>
                  <p className="flex justify-between"><span>Le travailleur recevra</span><strong className="tabular-nums">{formatXOF(breakdown.net)}</strong></p>
                  <p className="text-muted-foreground">Avant frais éventuels du prestataire de paiement, affichés au moment du paiement.</p>
                </div>
              )}
            </div>
          </Section>

          <Section n={3} title="Lieu" description="La zone affichée est approximative ; l'adresse reste privée." done={done.place}>
            <div className="grid gap-4">
              <Controller control={control} name="workMode" render={({ field }) => (
                <div role="radiogroup" aria-label="Mode de réalisation" className="grid grid-cols-2 gap-2">
                  {[["on_site", "Sur place"], ["remote", "À distance"]].map(([val, label]) => (
                    <label key={val} className={cn("flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25", field.value === val && "border-primary bg-accent/60 text-accent-foreground")}>
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
            </div>
          </Section>

          <Section n={4} title="Photos" description="6 photos maximum · JPG, PNG ou WebP, 5 Mo max chacune. La première sert d'image d'annonce." done={done.photos} optional>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {images.map((img, i) => (
                <div key={img.id} className="group relative">
                  <Image src={storagePublicUrl("job-images", img.storage_path) ?? ""} alt="" width={120} height={90} className="aspect-[4/3] w-full rounded-xl object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">Couverture</span>}
                  {jobId && (
                    <button type="button" aria-label="Supprimer la photo" className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white" onClick={async () => {
                      const res = await removeJobImageAction(img.id, jobId);
                      if (res.ok) setImages(images.filter((x) => x.id !== img.id));
                      else toast.error(res.error);
                    }}><Trash2 className="size-3.5" /></button>
                  )}
                </div>
              ))}
              {previews.map((p, i) => (
                <div key={p.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant envoi */}
                  <img src={p.url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
                  {images.length === 0 && i === 0 && <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">Couverture</span>}
                  <button type="button" aria-label="Retirer" className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="size-3.5" /></button>
                </div>
              ))}
              {images.length + files.length < 6 && (
                <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-accent/40 hover:text-primary">
                  <ImagePlus className="size-5" />
                  <span className="sr-only">Ajouter des photos</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(ev) => { addFiles(ev.target.files); ev.target.value = ""; }} />
                </label>
              )}
            </div>
            {!done.photos && <p className="mt-3 text-xs text-muted-foreground">Sans photo, l&apos;annonce utilise une illustration de la catégorie « {category?.name ?? "choisie"} ».</p>}
          </Section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          <QualityMeter {...quality} />
          <div>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Aperçu dans la liste</p>
            <JobCard
              preview
              coverOverride={cover}
              job={{
                id: "apercu",
                title: v.title || "Titre de votre mission",
                description: v.description || "La description de votre mission apparaîtra ici.",
                category_name: category?.name ?? "Catégorie",
                category_icon: category?.icon ?? "briefcase",
                category_slug: category?.slug,
                budget_amount: budgetNumber > 0 ? budgetNumber : 0,
                pay_type: v.payType ?? "fixed",
                city: v.city || "Ville",
                neighborhood: v.neighborhood || "Quartier",
                work_mode: v.workMode ?? "on_site",
                deadline: v.deadline ?? "",
                workers_needed: Number(v.workersNeeded) || 1,
                applications_count: 0,
                created_at: new Date().toISOString(),
              }}
            />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-2xl border bg-white/90 p-3 shadow-[var(--shadow-lift)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-sm text-muted-foreground sm:block">
          {steps.filter((s) => s.ok).length}/4 étapes complétées
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {canPublishDraft && <Button type="button" variant="secondary" onClick={() => submit("draft")} loading={formState.isSubmitting}><Save /> Brouillon</Button>}
          <Button type="submit" size="lg" className="shadow-[0_10px_24px_-8px_rgb(22_163_74/0.6)]"><Eye /> Prévisualiser</Button>
        </div>
      </div>
    </form>
  );
}
