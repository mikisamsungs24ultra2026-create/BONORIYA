/**
 * DTPFormModal — Add / Edit Day Trip Property
 * Standalone component, fully isolated from AdminDashboard state.
 */
import { useState, useEffect, useCallback } from 'react';
import { X, Upload, MapPin, Trash2 } from 'lucide-react';
import {
  createDayTripProperty, updateDayTripProperty, uploadDayTripPropertyPhoto,
  type DayTripProperty, type BonoriyaGalleryImage, type DayTripFAQ,
} from '../utils/auth';

interface Props {
  /** Pass null for "Add New", or an existing property for "Edit" */
  property: DayTripProperty | null;
  onSaved: (updated: DayTripProperty[]) => void;
  onClose: () => void;
}

/** Coerce any gallery value from DB into a proper BonoriyaGalleryImage[].
 *  Handles: string[], {url}[], proper BonoriyaGalleryImage[]. */
function normalizeGallery(raw: unknown): BonoriyaGalleryImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(item => item != null)
    .map((item, i): BonoriyaGalleryImage => {
      if (typeof item === 'string') {
        return { id: String(i), url: item, caption: '', isMain: i === 0 };
      }
      if (typeof item === 'object') {
        const o = item as Record<string, unknown>;
        return {
          id: String(o.id ?? i),
          url: String(o.url ?? ''),
          caption: typeof o.caption === 'string' ? o.caption : '',
          isMain: Boolean(o.isMain ?? i === 0),
        };
      }
      return { id: String(i), url: '', caption: '', isMain: false };
    })
    .filter(img => img.url.length > 0);
}

type FormData = {
  propertyType: 'bonoriya_own' | 'associated';
  name: string;
  tagline: string;
  location: string;
  shortDescription: string;
  aboutUs: string;
  priceRange: string;
  maxCapacityPerDay: number;
  rating: string;
  contactPhone: string;
  contactEmail: string;
  heroImage: string;
  gallery: BonoriyaGalleryImage[];
  howToReach: string;
  lat: number;
  lng: number;
  mapAddress: string;
  active: boolean;
  highlights: string[];
  mealOptions: { value: string; label: string; price: number }[];
  sortOrder: number;
  faqs: DayTripFAQ[];
};

function blankForm(): FormData {
  return {
    propertyType: 'bonoriya_own',
    name: '',
    tagline: '',
    location: '',
    shortDescription: '',
    aboutUs: '',
    priceRange: '₹1,000–1,500',
    maxCapacityPerDay: 100,
    rating: '4.8',
    contactPhone: '+91-9864282966',
    contactEmail: 'info@bonoriya.com',
    heroImage: '',
    gallery: [],
    howToReach: '',
    lat: 25.5788,
    lng: 91.8933,
    mapAddress: '',
    active: true,
    highlights: [],
    mealOptions: [],
    sortOrder: 0,
    faqs: [],
  };
}

function fromProperty(p: DayTripProperty): FormData {
  return {
    propertyType: p.propertyType ?? 'bonoriya_own',
    name: p.name ?? '',
    tagline: p.tagline ?? '',
    location: p.location ?? '',
    shortDescription: p.shortDescription ?? '',
    aboutUs: p.aboutUs ?? '',
    priceRange: p.priceRange ?? '₹1,000–1,500',
    maxCapacityPerDay: p.maxCapacityPerDay ?? 100,
    rating: String(p.rating ?? '4.8'),
    contactPhone: p.contactPhone ?? '',
    contactEmail: p.contactEmail ?? '',
    heroImage: p.heroImage ?? '',
    gallery: normalizeGallery(p.gallery),
    howToReach: p.howToReach ?? '',
    lat: p.lat ?? 25.5788,
    lng: p.lng ?? 91.8933,
    mapAddress: p.mapAddress ?? '',
    active: p.active ?? true,
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    mealOptions: Array.isArray(p.mealOptions) ? p.mealOptions : [],
    sortOrder: p.sortOrder ?? 0,
    faqs: Array.isArray(p.faqs) ? p.faqs : [],
  };
}

export default function DTPFormModal({ property, onSaved, onClose }: Props) {
  const isEdit = property !== null;
  const [form, setForm] = useState<FormData>(() =>
    isEdit ? fromProperty(property!) : blankForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Re-init if the property prop changes (e.g. user clicks Edit on a different card)
  useEffect(() => {
    setForm(isEdit ? fromProperty(property!) : blankForm());
    setError('');
  }, [property?.id]);

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Property name is required.'); return; }
    if (!form.location.trim()) { setError('Location is required.'); return; }
    setError('');
    setSaving(true);
    try {
      // Strip blank FAQ rows before saving (empty question OR empty answer)
      const cleanedFaqs = (form.faqs || [])
        .map(f => ({ question: (f.question || '').trim(), answer: (f.answer || '').trim() }))
        .filter(f => f.question && f.answer);
      const payload = { ...form, faqs: cleanedFaqs };

      if (isEdit && property) {
        await updateDayTripProperty(property.id, payload);
      } else {
        const created = await createDayTripProperty(payload as Omit<DayTripProperty, 'id' | 'createdAt' | 'updatedAt'>);
        if (!created) throw new Error('Property could not be created.');
      }
      // Reload from Supabase so UI reflects the persisted rows (incl. faqs)
      const { getDayTripProperties } = await import('../utils/auth');
      const all = await getDayTripProperties();
      onSaved(all);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleHeroUpload = async (file: File) => {
    const id = isEdit ? property!.id : 'new-' + Date.now();
    const url = await uploadDayTripPropertyPhoto(file, id);
    if (url) set('heroImage', url);
  };

  const handleGalleryUpload = async (files: FileList) => {
    const id = isEdit ? property!.id : 'tmp-' + Date.now();
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { alert(`${file.name} exceeds 5MB`); continue; }
      const url = await uploadDayTripPropertyPhoto(file, id);
      if (url) {
        const img: BonoriyaGalleryImage = {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          url,
          caption: '',
          isMain: form.gallery.length === 0,
        };
        setForm(prev => ({
          ...prev,
          gallery: [...prev.gallery, img],
          heroImage: prev.heroImage || url,
        }));
      }
    }
  };

  const updateGalleryItem = (idx: number, patch: Partial<BonoriyaGalleryImage>) => {
    setForm(prev => ({
      ...prev,
      gallery: prev.gallery.map((g, i) => i === idx ? { ...g, ...patch } : g),
    }));
  };

  const removeGalleryItem = (idx: number) => {
    setForm(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }));
  };

  const setMainGalleryItem = (idx: number) => {
    setForm(prev => ({
      ...prev,
      gallery: prev.gallery.map((g, i) => ({ ...g, isMain: i === idx })),
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">
            {isEdit ? `Edit: ${property!.name}` : 'Add New Day Trip Property'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Property Type</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              value={form.propertyType}
              onChange={e => set('propertyType', e.target.value as 'bonoriya_own' | 'associated')}
            >
              <option value="bonoriya_own">BONORIYA Own</option>
              <option value="associated">Associated</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>BONORIYA Own</strong> — No Commission on Booking, No GST on Commission&nbsp;&nbsp;·&nbsp;&nbsp;
              <strong>Associated</strong> — 10% Commission on Booking + 18% GST on Commission
            </p>
          </div>

          {/* Name & Tagline */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property Name *</label>
              <input
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Bonoriya Agro Eco Tourism"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tagline</label>
              <input
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
                value={form.tagline}
                onChange={e => set('tagline', e.target.value)}
                placeholder="Short catchy phrase"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">Location *</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Village, District, State"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Short Description</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              value={form.shortDescription}
              onChange={e => set('shortDescription', e.target.value)}
              placeholder="One-liner for property cards"
            />
          </div>

          {/* About */}
          <div>
            <label className="block text-sm font-medium mb-1">About</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              rows={3}
              value={form.aboutUs}
              onChange={e => set('aboutUs', e.target.value)}
              placeholder="Detailed description..."
            />
          </div>

          {/* Pricing / Capacity / Rating */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price Range</label>
              <input
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
                value={form.priceRange}
                onChange={e => set('priceRange', e.target.value)}
                placeholder="₹1,000–1,500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Capacity/Day</label>
              <input
                type="number" min={1}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
                value={form.maxCapacityPerDay}
                onChange={e => set('maxCapacityPerDay', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rating</label>
              <input
                type="number" step={0.1} min={0} max={5}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
                value={form.rating}
                onChange={e => set('rating', e.target.value)}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
                value={form.contactPhone}
                onChange={e => set('contactPhone', e.target.value)}
                placeholder="+91-9864282966"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
                value={form.contactEmail}
                onChange={e => set('contactEmail', e.target.value)}
                placeholder="info@bonoriya.com"
              />
            </div>
          </div>

          {/* Hero Image */}
          <div>
            <label className="block text-sm font-medium mb-1">Hero Image URL</label>
            <input
              type="url"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              value={form.heroImage}
              onChange={e => set('heroImage', e.target.value)}
              placeholder="https://..."
            />
            {form.heroImage && (
              <img src={form.heroImage} alt="Hero preview" className="mt-2 h-32 w-full object-cover rounded-lg border border-border" />
            )}
            <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
              <Upload className="h-3.5 w-3.5" />
              Upload image file
              <input
                type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); e.target.value = ''; }}
              />
            </label>
          </div>

          {/* Gallery */}
          <div>
            <label className="block text-sm font-medium mb-1">Photo Gallery</label>
            {form.gallery.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {form.gallery.map((img, idx) => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted">
                    <img src={img.url} alt={img.caption || `Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {img.isMain && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                        Main
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {!img.isMain && (
                      <button
                        type="button"
                        onClick={() => setMainGalleryItem(idx)}
                        className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-center"
                      >
                        Set Main
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 border border-dashed border-border rounded-lg hover:bg-muted/30 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              Add Photos (JPG/PNG/WEBP · max 5MB)
              <input
                type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) { handleGalleryUpload(e.target.files); e.target.value = ''; } }}
              />
            </label>
          </div>

          {/* How to Reach */}
          <div>
            <label className="block text-sm font-medium mb-1">How to Reach</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              rows={2}
              value={form.howToReach}
              onChange={e => set('howToReach', e.target.value)}
              placeholder="Directions from nearest city..."
            />
          </div>

          {/* GPS Coordinates */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">GPS Coordinates</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Find coordinates by right-clicking on{' '}
              <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-primary underline">
                Google Maps
              </a>{' '}
              → &quot;What&apos;s here?&quot;
            </p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-xs font-medium mb-1">Latitude</label>
                <input
                  type="number" step={0.000001}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background"
                  value={form.lat}
                  onChange={e => set('lat', parseFloat(e.target.value) || 25.5788)}
                  placeholder="25.578800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Longitude</label>
                <input
                  type="number" step={0.000001}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background"
                  value={form.lng}
                  onChange={e => set('lng', parseFloat(e.target.value) || 91.8933)}
                  placeholder="91.893300"
                />
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-xs font-medium mb-1">Map Address Label</label>
              <input
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background"
                value={form.mapAddress}
                onChange={e => set('mapAddress', e.target.value)}
                placeholder="e.g. Jimbrigaon, Halher, Meghalaya 793001"
              />
            </div>
            {form.lat !== 0 && form.lng !== 0 && (
              <a
                href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" /> Preview on Google Maps
              </a>
            )}
          </div>

          {/* FAQs */}
          <div>
            <label className="block text-sm font-medium mb-1">Day Trip FAQs</label>
            <p className="text-xs text-muted-foreground mb-2">
              These questions/answers appear at the bottom of this property&apos;s Day Trip booking page.
              Leave empty to hide the FAQ section for this property.
            </p>
            {form.faqs.length > 0 && (
              <div className="space-y-2 mb-3">
                {form.faqs.map((faq, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Q{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== idx) }))}
                        className="p-1 hover:bg-red-50 rounded"
                        aria-label={`Remove FAQ ${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </button>
                    </div>
                    <input
                      className="w-full px-3 py-1.5 border border-border rounded text-sm bg-white"
                      placeholder="Question"
                      value={faq.question}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        faqs: prev.faqs.map((f, i) => i === idx ? { ...f, question: e.target.value } : f),
                      }))}
                    />
                    <textarea
                      rows={2}
                      className="w-full px-3 py-1.5 border border-border rounded text-sm bg-white"
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        faqs: prev.faqs.map((f, i) => i === idx ? { ...f, answer: e.target.value } : f),
                      }))}
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }))}
              className="px-3 py-1.5 border border-dashed border-border rounded-lg text-xs hover:bg-muted/30"
            >
              + Add FAQ
            </button>
          </div>

          {/* Active toggle */}
          <div className="pt-2 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('active', !form.active)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm">{form.active ? 'Active — visible on website' : 'Inactive — hidden from website'}</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 disabled:opacity-50 min-w-[120px]"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Property'}
          </button>
        </div>
      </div>
    </div>
  );
}
