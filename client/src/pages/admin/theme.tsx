import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { hexToHsl, hslStringToHex } from "@/lib/hex-to-hsl";
import { CheckCircle2 } from "lucide-react";

const FONT_OPTIONS = [
  { label: "Playfair Display (Serif)", value: "'Playfair Display', serif" },
  { label: "Georgia (Serif)", value: "Georgia, serif" },
  { label: "Palatino (Serif)", value: "'Palatino Linotype', serif" },
  { label: "Times New Roman (Serif)", value: "'Times New Roman', serif" },
  { label: "Lato (Sans-serif)", value: "'Lato', sans-serif" },
  { label: "Arial (Sans-serif)", value: "Arial, sans-serif" },
  { label: "Helvetica (Sans-serif)", value: "Helvetica, sans-serif" },
  { label: "Trebuchet MS (Sans-serif)", value: "'Trebuchet MS', sans-serif" },
];

const settingsSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  eventDate: z.string().nullable(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  fontFamily: z.string(),
  backgroundImage: z.string().nullable(),
});
type FormValues = z.infer<typeof settingsSchema>;

function ColorPickerField({ label, value, onChange, description }: { label: string; value: string; onChange: (v: string) => void; description?: string }) {
  const hexValue = value.startsWith("#") ? value : hslStringToHex(value);
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium leading-none">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-3">
        <input type="color" value={hexValue.length === 7 ? hexValue : "#d4a574"} onChange={e => onChange(e.target.value)}
          className="w-12 h-10 rounded-md border border-input cursor-pointer p-0.5 bg-background" />
        <Input value={hexValue} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          placeholder="#d4a574" className="font-mono text-sm w-32" maxLength={7} />
        <div className="w-10 h-10 rounded-md border border-input flex-shrink-0"
          style={{ backgroundColor: hexValue.length === 7 ? hexValue : "transparent" }} />
      </div>
    </div>
  );
}

export default function ThemePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

  const updateSettings = useMutation({
    mutationFn: (data: any) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Theme saved", description: "Your changes are now live on the guest page." });
    },
    onError: () => toast({ title: "Save failed", description: "Something went wrong. Please try again.", variant: "destructive" }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { eventName: "", eventDate: "", primaryColor: "#d4a574", secondaryColor: "#8b5e3c", fontFamily: "'Playfair Display', serif", backgroundImage: "" },
  });

  useEffect(() => {
    if (settings) form.reset({
      eventName: settings.eventName || "",
      eventDate: settings.eventDate ? settings.eventDate.substring(0, 10) : "",
      primaryColor: settings.primaryColor || "#d4a574",
      secondaryColor: settings.secondaryColor || "#8b5e3c",
      fontFamily: settings.fontFamily || "'Playfair Display', serif",
      backgroundImage: settings.backgroundImage || "",
    });
  }, [settings, form]);

  const watchedPrimary = form.watch("primaryColor");
  const watchedSecondary = form.watch("secondaryColor");
  const watchedFont = form.watch("fontFamily");

  useEffect(() => { const hsl = hexToHsl(watchedPrimary); if (hsl) document.documentElement.style.setProperty("--primary", hsl); }, [watchedPrimary]);
  useEffect(() => { const hsl = hexToHsl(watchedSecondary); if (hsl) document.documentElement.style.setProperty("--secondary", hsl); }, [watchedSecondary]);
  useEffect(() => { if (watchedFont) document.documentElement.style.setProperty("--app-font-serif", watchedFont); }, [watchedFont]);

  const onSubmit = (values: FormValues) => {
    updateSettings.mutate({ ...values, eventDate: values.eventDate ? new Date(values.eventDate).toISOString() : null, backgroundImage: values.backgroundImage || null });
  };

  if (isLoading) return <div className="space-y-4 max-w-2xl">{[1,2,3].map(i => <div key={i} className="h-40 bg-muted/40 rounded-lg animate-pulse" />)}</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif text-foreground">Theme & Details</h1>
        <p className="text-muted-foreground mt-1">Customize the public guest lookup page. Changes apply live instantly.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-sm border-muted">
            <CardHeader><CardTitle className="font-serif">Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="eventName" render={({ field }) => (
                <FormItem><FormLabel>Event Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Emma & James Wedding" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="eventDate" render={({ field }) => (
                <FormItem><FormLabel>Event Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-muted">
            <CardHeader>
              <CardTitle className="font-serif">Visual Theme</CardTitle>
              <CardDescription>Pick colors and a font for the guest-facing page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Controller control={form.control} name="primaryColor" render={({ field }) => (
                <ColorPickerField label="Primary Color" description="Used for headings, buttons, and highlighted table on the floor plan." value={field.value} onChange={field.onChange} />
              )} />
              <Controller control={form.control} name="secondaryColor" render={({ field }) => (
                <ColorPickerField label="Secondary Color" description="Used for accents and secondary UI elements." value={field.value} onChange={field.onChange} />
              )} />
              <FormField control={form.control} name="fontFamily" render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Family</FormLabel>
                  <FormControl>
                    <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {FONT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-muted">
            <CardHeader><CardTitle className="font-serif">Background</CardTitle><CardDescription>Optional background image URL.</CardDescription></CardHeader>
            <CardContent>
              <FormField control={form.control} name="backgroundImage" render={({ field }) => (
                <FormItem><FormLabel>Background Image URL</FormLabel><FormControl>
                  <Input {...field} value={field.value || ""} placeholder="https://example.com/flowers.jpg" />
                </FormControl></FormItem>
              )} />
              {form.watch("backgroundImage") && (
                <div className="mt-3 h-24 rounded-md border border-muted bg-cover bg-center opacity-60"
                  style={{ backgroundImage: `url(${form.watch("backgroundImage")})` }} />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-muted">
            <CardHeader><CardTitle className="font-serif">Live Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border border-muted p-6 bg-card text-center space-y-2" style={{ fontFamily: watchedFont }}>
                <p className="text-3xl font-semibold" style={{ color: watchedPrimary.length === 7 ? watchedPrimary : "#d4a574", fontFamily: watchedFont }}>
                  {form.watch("eventName") || "Our Wedding"}
                </p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">
                  {form.watch("eventDate") ? new Date(form.watch("eventDate")!).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "June 15, 2025"}
                </p>
                <div className="pt-2">
                  <button type="button" className="px-5 py-2 rounded text-sm text-white font-medium"
                    style={{ backgroundColor: watchedPrimary.length === 7 ? watchedPrimary : "#d4a574" }}>Find My Seat</button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={updateSettings.isPending} className="min-w-[160px]">
              {updateSettings.isPending ? "Saving..." : "Save Theme Settings"}
            </Button>
            {updateSettings.isSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
