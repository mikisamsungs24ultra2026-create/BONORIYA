import { useState, useRef } from 'react';
import {
  Plus, Save, Trash2, Upload, X, ChevronLeft, ChevronRight,
  Star, AlertCircle, CheckCircle, GripVertical, Image, AlignLeft, RefreshCw
} from 'lucide-react';
import type { PartnerPropertyData, PartnerRoomData, RoomPhoto } from '../utils/auth';
import { deleteRoomPhotoFromSupabase } from '../utils/auth';
import { supabase } from '../utils/db';

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB max
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const PHOTO_LABELS = ['Bedroom', 'Bathroom', 'Balcony / View', 'Seating Area', 'Wardrobe / Storage', 'AC Unit', 'TV', 'Room View', 'Amenities', 'Other'];

function gst(base: number) { return base <= 1000 ? 0 : base <= 7500 ? 5 : 18; }

/** Upload a single image file to Supabase room-photos Storage bucket */
async function uploadRoomPhotoToStorage(file: File, partnerId: string, roomId: number): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${partnerId}/${roomId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('room-photos').upload(path, file, { upsert: true });
  if (error) { console.error('[roomPhotoUpload]', error.message); return null; }
  return supabase.storage.from('room-photos').getPublicUrl(path).data.publicUrl;
}

// ─── Room Photo Section ───────────────────────────────────────────────────────

function RoomPhotoSection({
  room, partnerId, onUpdatePhotos, onSaved
}: {
  room: PartnerRoomData;
  partnerId: string;
  onUpdatePhotos: (p: RoomPhoto[]) => void;
  onSaved: () => void;
}) {
  const [previewIdx, setPreviewIdx]       = useState(0);
  const [uploadError, setUploadError]     = useState('');
  const [uploading, setUploading]         = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<RoomPhoto[]>([]);
  const [dragOver, setDragOver]           = useState(false);
  const [dragIdx, setDragIdx]             = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx]     = useState<number | null>(null);
  const [showSection, setShowSection]     = useState(false);
  const [saved, setSaved]                 = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const photos = room.photos ?? [];
  const allPhotos = [...photos, ...pendingPhotos];

  // Upload files to Supabase Storage, assign correct label per photo
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploadError('');
    setUploading(true);
    const validFiles = Array.from(files).filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) { setUploadError(`"${f.name}" — use JPG, JPEG, PNG or WEBP.`); return false; }
      if (f.size > MAX_FILE_BYTES) { setUploadError(`"${f.name}" exceeds 3 MB.`); return false; }
      return true;
    });

    const uploaded: RoomPhoto[] = [];
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const url = await uploadRoomPhotoToStorage(file, partnerId, room.id);
      if (!url) { setUploadError(`Failed to upload "${file.name}". Check network and try again.`); continue; }
      uploaded.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url,
        fileName: file.name,
        isPrimary: photos.length === 0 && pendingPhotos.length === 0 && i === 0,
        // Fix: assign label based on sequential index, NOT photos.length (which caused mismatch)
        label: PHOTO_LABELS[i % PHOTO_LABELS.length],
      });
    }
    setUploading(false);
    if (uploaded.length > 0) setPendingPhotos(prev => [...prev, ...uploaded]);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Save — commit pending photos to the room permanently
  const savePhotos = () => {
    if (pendingPhotos.length === 0) { onSaved(); return; }
    // IMPORTANT: call onUpdatePhotos first, which triggers the parent save with new photos.
    // Do NOT call onSaved() after — that would trigger a second save with stale propData
    // that doesn't include the new photos (React state hasn't updated yet).
    onUpdatePhotos([...photos, ...pendingPhotos]);
    setPendingPhotos([]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Show toast only — parent already saved in onUpdateRoomPhotos
    onSaved();
  };

  // Cancel — discard pending uploads (also delete from Storage)
  const cancelPending = () => {
    pendingPhotos.forEach(p => deleteRoomPhotoFromSupabase(p.id, p.url));
    setPendingPhotos([]);
  };

  const del = (id: string, isPending: boolean) => {
    if (isPending) {
      const p = pendingPhotos.find(p => p.id === id);
      setPendingPhotos(prev => prev.filter(p => p.id !== id));
      if (p) deleteRoomPhotoFromSupabase(id, p.url);
    } else {
      const photo = photos.find(p => p.id === id);
      const rest = photos.filter(p => p.id !== id);
      if (rest.length > 0 && photo?.isPrimary) rest[0].isPrimary = true;
      onUpdatePhotos(rest);
      if (previewIdx >= rest.length) setPreviewIdx(Math.max(0, rest.length - 1));
      if (photo) deleteRoomPhotoFromSupabase(id, photo.url);
      onSaved();
    }
  };

  const setPrimary = (id: string) => {
    onUpdatePhotos(photos.map(p => ({ ...p, isPrimary: p.id === id })));
    onSaved();
  };

  // Correct label update — always uses the individual photo's id
  const setLabel = (id: string, label: string, isPending: boolean) => {
    if (isPending) {
      setPendingPhotos(prev => prev.map(p => p.id === id ? { ...p, label } : p));
    } else {
      onUpdatePhotos(photos.map(p => p.id === id ? { ...p, label } : p));
      onSaved();
    }
  };

  const onDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const arr = [...photos];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    onUpdatePhotos(arr);
    setDragIdx(null); setDragOverIdx(null); setPreviewIdx(targetIdx);
    onSaved();
  };

  return (
    <div className="border-t border-border">
      <button onClick={() => setShowSection(s => !s)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 text-sm transition-colors">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span>Room Photos</span>
          {photos.length > 0 && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{photos.length} saved</span>}
          {pendingPhotos.length > 0 && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">{pendingPhotos.length} unsaved</span>}
        </div>
        <span className="text-muted-foreground text-xs">{showSection ? '▲ Hide' : '▼ Manage Photos'}</span>
      </button>

      {showSection && (
        <div className="px-5 pb-5 space-y-4">

          {/* Saved photos slider */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saved Photos</p>
              <div className="relative h-52 rounded-xl overflow-hidden bg-muted border border-border">
                <img src={photos[previewIdx]?.url} alt={photos[previewIdx]?.label} className="w-full h-full object-cover" />
                {photos[previewIdx]?.isPrimary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                    <Star className="h-3 w-3 fill-current" /> Primary
                  </div>
                )}
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPreviewIdx(i => (i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-forest-900/50 hover:bg-forest-900/80 text-white rounded-full flex items-center justify-center"><ChevronLeft className="h-5 w-5" /></button>
                    <button onClick={() => setPreviewIdx(i => (i + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-forest-900/50 hover:bg-forest-900/80 text-white rounded-full flex items-center justify-center"><ChevronRight className="h-5 w-5" /></button>
                    <div className="absolute bottom-2 right-3 bg-forest-900/60 text-white text-xs px-2 py-0.5 rounded-full">{previewIdx + 1}/{photos.length}</div>
                  </>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, idx) => (
                  <div key={p.id} draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                    onDrop={() => onDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    onClick={() => setPreviewIdx(idx)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${idx === previewIdx ? 'border-primary shadow-md scale-105' : 'border-border'} ${dragOverIdx === idx ? 'opacity-60 border-dashed border-primary' : ''}`}>
                    <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                    <div className="absolute top-0.5 left-0.5"><GripVertical className="h-3 w-3 text-white/80 drop-shadow" /></div>
                    {p.isPrimary && <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-center text-[9px] py-0.5">Primary</div>}
                    <button onClick={e => { e.stopPropagation(); del(p.id, false); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-forest-900/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center"><X className="h-2.5 w-2.5" /></button>
                  </div>
                ))}
              </div>
              {/* Per-photo controls */}
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground">Label:</label>
                  <select className="px-2 py-1 border border-border rounded text-xs bg-input-background"
                    value={photos[previewIdx]?.label}
                    onChange={e => setLabel(photos[previewIdx].id, e.target.value, false)}>
                    {PHOTO_LABELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                {!photos[previewIdx]?.isPrimary && (
                  <button onClick={() => setPrimary(photos[previewIdx].id)} className="flex items-center gap-1 px-3 py-1 border border-border rounded hover:bg-muted text-xs"><Star className="h-3 w-3" /> Set as Primary</button>
                )}
                <button onClick={() => del(photos[previewIdx].id, false)} className="flex items-center gap-1 px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 text-xs"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          )}

          {/* Pending (unsaved) photos */}
          {pendingPhotos.length > 0 && (
            <div className="space-y-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-xs font-medium text-yellow-800">⚠️ {pendingPhotos.length} photo{pendingPhotos.length > 1 ? 's' : ''} uploaded but not yet saved</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingPhotos.map((p, idx) => (
                  <div key={p.id} className="relative flex-shrink-0 space-y-1">
                    <div className="w-20 h-16 rounded-lg overflow-hidden border-2 border-yellow-400">
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      <button onClick={() => del(p.id, true)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-forest-900/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center"><X className="h-2.5 w-2.5" /></button>
                    </div>
                    {/* Correct label selector — each photo has its own individual selector */}
                    <select className="w-20 text-[10px] px-1 py-0.5 border border-border rounded bg-white"
                      value={p.label}
                      onChange={e => setLabel(p.id, e.target.value, true)}>
                      {PHOTO_LABELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {/* Save / Cancel buttons — shown after upload */}
              <div className="flex gap-2">
                <button onClick={savePhotos} className="flex items-center gap-1.5 px-4 py-2 bg-forest-900 text-white rounded-lg text-sm font-medium hover:bg-forest-900/80">
                  {saved ? <><CheckCircle className="h-4 w-4" /> SAVED SUCCESSFULLY</> : <><Save className="h-4 w-4" /> Save Photos</>}
                </button>
                <button onClick={cancelPending} className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"><X className="h-4 w-4" /> Cancel</button>
              </div>
            </div>
          )}

          {/* Upload zone */}
          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><AlertCircle className="h-4 w-4 flex-shrink-0" />{uploadError}</div>
          )}

          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/10'} ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {uploading ? <RefreshCw className="h-7 w-7 text-primary animate-spin" /> : <Upload className="h-7 w-7 text-muted-foreground" />}
            <div className="text-center">
              <p className="text-sm font-medium">{uploading ? 'Uploading to Supabase Storage…' : 'Click or drag & drop to upload'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG · JPEG · PNG · WEBP — max 3 MB each</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" multiple disabled={uploading} onChange={e => handleFiles(e.target.files)} />
          </label>

          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>• Each photo has its own label selector — set the correct room area for each</p>
            <p>• Drag thumbnails to reorder · Set one as Primary to show first to guests</p>
            <p>• Photos upload directly to Supabase Storage (not localStorage)</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single Room Card ─────────────────────────────────────────────────────────

function RoomCard({
  room, partnerId, isEditing, editForm,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete, onFormChange, onUpdatePhotos, onSaved
}: {
  room: PartnerRoomData;
  partnerId: string;
  isEditing: boolean;
  editForm: PartnerRoomData | null;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onFormChange: (f: PartnerRoomData) => void;
  onUpdatePhotos: (p: RoomPhoto[]) => void;
  onSaved: () => void;
}) {
  const g     = gst(room.basePrice);
  const gstAmt = Math.round(room.basePrice * g / 100);
  const upd   = (k: keyof PartnerRoomData, v: unknown) => editForm && onFormChange({ ...editForm, [k]: v });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        {isEditing && editForm
          ? <input type="text" className="px-3 py-1 border border-border rounded text-lg w-64 focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.type} onChange={e => upd('type', e.target.value)} />
          : <h3 className="text-lg font-medium">{room.type}</h3>
        }
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={onSaveEdit} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"><Save className="h-3.5 w-3.5" /> Save</button>
              <button onClick={onCancelEdit} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={onStartEdit} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted">Edit Details</button>
              <button onClick={onDelete} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Edit form */}
      {isEditing && editForm ? (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="block text-sm mb-1">Base Occupancy</label><input type="number" min="1" className="w-full px-3 py-2 border border-border rounded-lg" value={editForm.baseOccupancy} onChange={e => upd('baseOccupancy', +e.target.value)} /></div>
            <div><label className="block text-sm mb-1">Max Occupancy</label><input type="number" min="1" className="w-full px-3 py-2 border border-border rounded-lg" value={editForm.maxOccupancy} onChange={e => upd('maxOccupancy', +e.target.value)} /></div>
            <div><label className="block text-sm mb-1">Available Rooms</label><input type="number" min="0" className="w-full px-3 py-2 border border-border rounded-lg" value={editForm.available} onChange={e => upd('available', +e.target.value)} /></div>
          </div>
          <div><label className="block text-sm mb-1">Base Rate (₹/night)</label><input type="number" min="0" className="w-full px-3 py-2 border border-border rounded-lg" value={editForm.basePrice} onChange={e => upd('basePrice', +e.target.value)} /></div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <AlignLeft className="h-4 w-4 text-muted-foreground" />
              <label className="block text-sm">Room Description <span className="text-muted-foreground font-normal">(shown to guests before booking)</span></label>
            </div>
            <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={4} placeholder="Describe the room — bed type, size, view, bathroom, balcony, AC, WiFi, TV, wardrobe…" value={editForm.description ?? ''} onChange={e => upd('description', e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
            <div><p className="text-xs text-muted-foreground">Base Rate</p><p className="text-lg">₹{room.basePrice.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">GST ({g}%)</p><p className="text-lg">₹{gstAmt.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Traveler Pays</p><p className="text-lg text-green-600">₹{(room.basePrice + gstAmt).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Your Revenue</p><p className="text-lg text-blue-600">₹{Math.round(room.basePrice * 0.9).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">after 10% comm.</p></div>
            <div><p className="text-xs text-muted-foreground">Available</p><p className="text-lg">{room.available} rooms</p></div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">Occ: {room.baseOccupancy}–{room.maxOccupancy} guests · Commission: ₹{Math.round(room.basePrice * 0.1).toLocaleString()}</p>
          {room.description && (
            <div className="mt-3 p-3 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center gap-1 mb-0.5"><AlignLeft className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Room Description</span></div>
              <p className="text-sm">{room.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Photo management */}
      <RoomPhotoSection room={room} partnerId={partnerId} onUpdatePhotos={onUpdatePhotos} onSaved={onSaved} />
    </div>
  );
}

// ─── RoomsTab ─────────────────────────────────────────────────────────────────

interface RoomsTabProps {
  propData: PartnerPropertyData;
  partnerId: string;
  editingRoom: number | null;
  roomEditForm: PartnerRoomData | null;
  onAddRoom: () => void;
  onStartEdit: (r: PartnerRoomData) => void;
  onSaveRoom: () => void;
  onCancelEdit: () => void;
  onDeleteRoom: (id: number) => void;
  onRoomEditFormChange: (f: PartnerRoomData | null) => void;
  onUpdateRoomPhotos: (roomId: number, photos: RoomPhoto[]) => void;
  onSaved: () => void;
}

export function RoomsTab({
  propData, partnerId, editingRoom, roomEditForm,
  onAddRoom, onStartEdit, onSaveRoom, onCancelEdit, onDeleteRoom,
  onRoomEditFormChange, onUpdateRoomPhotos, onSaved
}: RoomsTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Rooms & Pricing</h2>
        <button onClick={onAddRoom} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"><Plus className="h-4 w-4" /> Add Room Type</button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="font-medium mb-1">Pricing Structure</p>
        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-2">
          <li>Traveler pays: Base Rate + GST (0% / 5% / 18% by rate tier)</li>
          <li>BONORIYA commission: 10% · Your revenue: 90% of base rate</li>
        </ul>
      </div>

      {propData.rooms.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-border rounded-xl">
          <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-3">No room types added yet.</p>
          <button onClick={onAddRoom} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">Add Your First Room Type</button>
        </div>
      ) : (
        <div className="space-y-4">
          {propData.rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              partnerId={partnerId}
              isEditing={editingRoom === room.id}
              editForm={editingRoom === room.id ? roomEditForm : null}
              onStartEdit={() => onStartEdit(room)}
              onSaveEdit={onSaveRoom}
              onCancelEdit={onCancelEdit}
              onDelete={() => onDeleteRoom(room.id)}
              onFormChange={f => onRoomEditFormChange(f)}
              onUpdatePhotos={photos => onUpdateRoomPhotos(room.id, photos)}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
