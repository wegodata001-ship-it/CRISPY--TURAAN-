"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/features/admin/image-upload";
import {
  subscribeToSettings,
  updateSettings,
  type AppSettings,
} from "@/services/settingsService";
import {
  uploadSettingsImage,
  deleteImageByUrl,
} from "@/services/storageService";
import { SystemStatusCard } from "@/features/admin/system-status-card";

export function SettingsAdmin() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return subscribeToSettings(setSettings, () => {});
  }, []);

  if (!settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-turquoise" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown">Settings</h1>
          <p className="text-sm text-coffee/60">Business info, branding & theme</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold text-dark-brown">Business Info</h2>
          <div>
            <Label>Store Name</Label>
            <Input
              value={settings.storeName}
              onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Hours</Label>
            <Textarea
              value={settings.hours}
              onChange={(e) => setSettings({ ...settings, hours: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold text-dark-brown">Branding</h2>
          <ImageUpload
            label="Logo"
            value={settings.logoUrl}
            onChange={(url) => setSettings({ ...settings, logoUrl: url })}
            onUpload={(file, onProgress) =>
              uploadSettingsImage(file, "logo", onProgress)
            }
            onDelete={deleteImageByUrl}
          />
          <ImageUpload
            label="Store Image"
            value={settings.storeImageUrl}
            onChange={(url) => setSettings({ ...settings, storeImageUrl: url })}
            onUpload={(file, onProgress) =>
              uploadSettingsImage(file, "store", onProgress)
            }
            onDelete={deleteImageByUrl}
          />
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft dark:bg-[#1a1412]">
          <h2 className="text-sm font-semibold dark:text-warm-white">SEO & Social</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>SEO Title</Label><Input value={settings.seo.title} onChange={(e) => setSettings({ ...settings, seo: { ...settings.seo, title: e.target.value } })} className="mt-1" /></div>
            <div><Label>WhatsApp</Label><Input value={settings.social.whatsapp} onChange={(e) => setSettings({ ...settings, social: { ...settings.social, whatsapp: e.target.value } })} className="mt-1" placeholder="+972..." /></div>
            <div className="sm:col-span-2"><Label>SEO Description</Label><Textarea value={settings.seo.description} onChange={(e) => setSettings({ ...settings, seo: { ...settings.seo, description: e.target.value } })} className="mt-1" /></div>
            <div><Label>Instagram</Label><Input value={settings.social.instagram} onChange={(e) => setSettings({ ...settings, social: { ...settings.social, instagram: e.target.value } })} className="mt-1" /></div>
            <div><Label>Google Maps URL</Label><Input value={settings.mapsUrl} onChange={(e) => setSettings({ ...settings, mapsUrl: e.target.value })} className="mt-1" /></div>
          </div>
        </div>

        <SystemStatusCard />

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft lg:col-span-2 dark:bg-[#1a1412]">
          <h2 className="text-sm font-semibold text-dark-brown">Theme Colors</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["primary", "accent", "background"] as const).map((key) => (
              <div key={key}>
                <Label className="capitalize">{key}</Label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={settings.theme[key]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme: { ...settings.theme, [key]: e.target.value },
                      })
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border"
                  />
                  <Input
                    value={settings.theme[key]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme: { ...settings.theme, [key]: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
