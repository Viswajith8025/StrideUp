"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X, Settings2, Lightbulb, SlidersHorizontal, User, Bell,
  Download, Upload, Gift, HelpCircle, Mail, Star, Share2,
  Shield, FileText, Footprints, Monitor, Moon, Sun, Smartphone,
  ChevronRight, Heart,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { Sheet } from "@/components/ui/sheet";
import { APP_NAME, APP_TAGLINE, APP_VERSION, APP_BUILD, BRAND, getShareText } from "@/lib/brand";
import { ACCENT_COLORS } from "@/lib/theme/constants";
import type { AccentColor, ThemeMode } from "@/types/database";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getActivityRange } from "@/lib/steps/service";
import { exportToCSV, exportToJSON, previewImport, executeImport } from "@/lib/import-export";
import { googleFitProvider } from "@/lib/import-export/providers";

const accentKeys = Object.keys(ACCENT_COLORS) as AccentColor[];

function SettingsRow({ icon: Icon, label, href, onClick, iconClass, showChevron = true }: {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  iconClass?: string;
  showChevron?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-4 py-3.5">
      <Icon size={22} className={iconClass ?? "text-accent"} />
      <span className="text-base flex-1">{label}</span>
      {showChevron && (href || onClick) && <ChevronRight size={18} className="text-muted" />}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  if (onClick) return <button onClick={onClick} className="w-full text-left">{content}</button>;
  return content;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, accentColor, widgetTheme, setTheme, setAccentColor, setWidgetTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewImport> | null>(null);
  const supabase = createClient();

  const handleExport = async (format: "csv" | "json") => {
    if (!user) return;
    const data = await getActivityRange(supabase, user.id, "2020-01-01", "2099-12-31");
    const content = format === "csv" ? exportToCSV(data) : exportToJSON(data);
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strideup-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
    toast("Export downloaded", "success");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const text = await file.text();
    const existing = await getActivityRange(supabase, user.id, "2020-01-01", "2099-12-31");
    const existingDates = new Set(existing.map((a) => a.date));
    setImportPreview(previewImport(text, existingDates));
    setShowImport(true);
    e.target.value = "";
  };

  const confirmImport = async () => {
    if (!user || !profile || !importPreview) return;
    await executeImport(supabase, user.id, profile, importPreview.valid);
    setShowImport(false);
    setImportPreview(null);
    toast(`Imported ${importPreview.valid.length} rows`, "success");
  };

  const shareApp = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      await navigator.share({ title: APP_NAME, text: getShareText(), url });
    } else {
      await navigator.clipboard.writeText(`${getShareText()} ${url}`);
      toast("Link copied!", "success");
    }
  };

  return (
    <AppShell showNav={false}>
      <header className="flex items-start gap-3 py-4">
        <button onClick={() => router.back()} aria-label="Close settings">
          <X size={28} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted text-sm">Set Colors. Change Units. Browse Add-ons.</p>
        </div>
      </header>

      <div className="rounded-2xl bg-card p-5 mb-6">
        <div className="flex justify-center gap-6 mb-6">
          {(["system", "dark", "light"] as ThemeMode[]).map((t) => (
            <button key={t} onClick={() => setTheme(t)} className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center border-2",
                theme === t ? "border-foreground" : "border-transparent",
                t === "system" && "bg-muted/30",
                t === "dark" && "bg-black",
                t === "light" && "bg-white"
              )}>
                {t === "system" && <Settings2 className="text-foreground" size={20} />}
                {t === "dark" && <Moon className="text-white" size={20} />}
                {t === "light" && <Sun className="text-black" size={20} />}
              </div>
              {theme === t && (
                <span className="rounded-full bg-foreground text-background px-3 py-0.5 text-xs font-medium capitalize">{t}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-3">
          {accentKeys.map((color) => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              className={cn(
                "h-8 w-8 rounded-full",
                accentColor === color && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
              )}
              style={{ background: ACCENT_COLORS[color].main }}
              aria-label={`Accent color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3 mb-4">
        <div className="flex items-center gap-3">
          <Smartphone className="text-accent" size={22} />
          <span>Widget Appearance</span>
        </div>
        <div className="flex gap-2">
          {(["system", "dark", "light"] as ThemeMode[]).map((t) => (
            <button
              key={t}
              onClick={() => setWidgetTheme(t)}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                widgetTheme === t ? "ring-2 ring-accent" : "",
                t === "system" && "bg-muted/30",
                t === "dark" && "bg-black",
                t === "light" && "bg-white"
              )}
            >
              {t === "system" && <Monitor size={14} />}
              {t === "dark" && <Moon size={14} className="text-white" />}
              {t === "light" && <Sun size={14} className="text-black" />}
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted text-xs uppercase tracking-wide mb-2">General</p>
      <div className="mb-6 divide-y divide-border">
        <SettingsRow icon={Lightbulb} label="Setup Step Counter" href="/settings/step-counter" />
        <SettingsRow icon={SlidersHorizontal} label="General" href="/settings/general" />
        <SettingsRow icon={User} label="Body Measurements" href="/settings/body" />
        <SettingsRow icon={User} label="Profile" href="/settings/profile" />
        <SettingsRow icon={Bell} label="Notifications" href="/settings/notifications" />
      </div>

      <p className="text-muted text-xs uppercase tracking-wide mb-2">Add-ons</p>
      <div className="mb-6 divide-y divide-border">
        <SettingsRow
          icon={Heart}
          label="Import from Google Fit"
          iconClass="text-green-500"
          onClick={() => toast(googleFitProvider.description, "info")}
        />
        <SettingsRow icon={Download} label="Import Data" onClick={() => document.getElementById("import-file")?.click()} />
        <input id="import-file" type="file" accept=".csv,.json" className="hidden" onChange={handleImportFile} />
        <SettingsRow icon={Upload} label="Export Data" onClick={() => setShowExport(true)} />
      </div>

      <p className="text-muted text-xs mb-4">{APP_NAME} {APP_VERSION} ({APP_BUILD})</p>

      <div className="mb-6 divide-y divide-border">
        <SettingsRow icon={Gift} label="What's New" onClick={() => toast(`${APP_NAME} v${APP_VERSION} — ${APP_TAGLINE}`, "info")} />
        <SettingsRow icon={HelpCircle} label="Support" href="/support" />
        <SettingsRow icon={Mail} label="Contact Us" onClick={() => window.open(`mailto:${BRAND.contactEmail}`, "_blank")} />
        <SettingsRow icon={Star} label="Rate App" onClick={() => toast("Thank you for your feedback!", "success")} />
        <SettingsRow icon={Share2} label="Share this App" onClick={shareApp} />
        <SettingsRow icon={Shield} label="Privacy Policy" href="/privacy" />
        <SettingsRow icon={FileText} label="Terms of Service" href="/terms" />
      </div>

      <p className="text-muted text-xs uppercase tracking-wide mb-2">Follow Us</p>
      <SettingsRow icon={Footprints} label="Blog" onClick={() => window.open(BRAND.blogUrl, "_blank")} />

      {profile?.role === "admin" && (
        <Link href="/admin" className="block mt-6 text-accent text-sm">Admin Panel →</Link>
      )}

      <button onClick={signOut} className="mt-8 mb-8 text-red-400 text-sm w-full text-center">
        Sign out
      </button>

      <Sheet open={showImport} onClose={() => setShowImport(false)} title="Import Preview">
        {importPreview && (
          <>
            <div className="space-y-2 text-sm mb-4">
              <p>Rows found: {importPreview.rows.length}</p>
              <p className="text-green-400">Valid: {importPreview.valid.length}</p>
              <p className="text-red-400">Invalid: {importPreview.invalid.length}</p>
              <p className="text-yellow-400">Duplicates: {importPreview.duplicates.length}</p>
              {importPreview.invalid.length > 0 && (
                <div className="mt-2 max-h-24 overflow-y-auto text-xs text-red-300">
                  {importPreview.invalid.map((i) => <p key={i.row}>Row {i.row}: {i.error}</p>)}
                </div>
              )}
            </div>
            <button onClick={confirmImport} className="w-full rounded-full bg-accent text-accent-foreground py-3 font-medium" disabled={importPreview.valid.length === 0}>
              Import {importPreview.valid.length} rows
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={showExport} onClose={() => setShowExport(false)} title="Export Data">
        <div className="space-y-3">
          <button onClick={() => handleExport("csv")} className="w-full rounded-xl bg-card-elevated py-3 font-medium">Export as CSV</button>
          <button onClick={() => handleExport("json")} className="w-full rounded-xl bg-card-elevated py-3 font-medium">Export as JSON</button>
        </div>
      </Sheet>
    </AppShell>
  );
}
