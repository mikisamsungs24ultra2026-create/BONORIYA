import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getInventory, saveInventorySlots, type InventorySlot, type PartnerRoomData } from '../utils/auth';

interface Props { partnerId: string; rooms: PartnerRoomData[]; onSaved?: () => void; }
type SlotStatus = 'available' | 'blocked' | 'sold-out';

const SCC: Record<SlotStatus, string> = {
  available: 'bg-green-100 text-green-800 border border-green-300',
  blocked:   'bg-red-100   text-red-800   border border-red-300',
  'sold-out':'bg-gray-200  text-gray-600  border border-gray-400',
};

function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start);
  while (d <= new Date(end)) { out.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1); }
  return out;
}

export default function PartnerInventory({ partnerId, rooms, onSaved }: Props) {
  const [month, setMonth]         = useState(new Date());
  const [roomId, setRoomId]       = useState<number>(rooms[0]?.id ?? 0);
  const [slots, setSlots]         = useState<InventorySlot[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel]             = useState<string[]>([]);
  const [toast, setToast]         = useState('');
  const [bulkStart, setBulkStart] = useState('');
  const [bulkEnd,   setBulkEnd]   = useState('');
  const [bulkStat,  setBulkStat]  = useState<SlotStatus>('available');
  const [bulkQty,   setBulkQty]   = useState(1);

  useEffect(() => { setSlots(getInventory(partnerId)); }, [partnerId]);
  useEffect(() => { if (rooms.length && !roomId) setRoomId(rooms[0].id); }, [rooms]);

  const show = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const today = new Date().toISOString().split('T')[0];
  const room  = rooms.find(r => r.id === roomId);

  const slot = (date: string) => slots.find(s => s.roomId === roomId && s.date === date);

  const upsert = (newSlots: InventorySlot[]) => {
    const base = [...slots];
    for (const s of newSlots) {
      const i = base.findIndex(x => x.roomId === s.roomId && x.date === s.date);
      if (i >= 0) base[i] = s; else base.push(s);
    }
    setSlots(base); return base;
  };

  const setOneSlot = (date: string, status: SlotStatus, qty?: number) => {
    const updated = upsert([{ roomId, date, available: qty ?? (status === 'available' ? (room?.available ?? 1) : 0), status }]);
    saveInventorySlots(partnerId, updated);
  };

  const applyToSelected = (status: SlotStatus) => {
    const newSlots = sel.map(date => ({ roomId, date, available: status === 'available' ? (room?.available ?? 1) : 0, status }));
    const updated = upsert(newSlots);
    saveInventorySlots(partnerId, updated);
    setSel([]); setSelecting(false);
    show(`${sel.length} date(s) marked as ${status}`);
    onSaved?.();
  };

  const saveAll = () => { saveInventorySlots(partnerId, slots); show('Inventory saved!'); onSaved?.(); };

  const applyBulk = () => {
    if (!bulkStart || !bulkEnd) { show('Select start and end dates.'); return; }
    const dates = dateRange(bulkStart, bulkEnd);
    const newSlots: InventorySlot[] = dates.map(date => ({
      roomId, date, available: bulkStat === 'available' ? bulkQty : 0, status: bulkStat,
    }));
    const updated = upsert(newSlots);
    saveInventorySlots(partnerId, updated);
    show(`${dates.length} date(s) bulk-updated`);
    onSaved?.();
  };

  const year = month.getFullYear(), m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  if (rooms.length === 0) return (
    <div className="bg-white rounded-lg border border-border p-8 text-center">
      <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-muted-foreground">Add room types first to manage inventory.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl bg-green-600 text-white text-sm">
          <CheckCircle className="h-5 w-5" /> {toast}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg border border-border p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm mb-1">Room Type</label>
          <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
            value={roomId} onChange={e => { setRoomId(+e.target.value); setSel([]); }}>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.type}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setSelecting(!selecting); setSel([]); }}
            className={`px-4 py-2 rounded-lg text-sm ${selecting ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>
            {selecting ? `Selecting (${sel.length})…` : 'Select Dates'}
          </button>
          {selecting && sel.length > 0 && (
            <>
              <button onClick={() => applyToSelected('available')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm">Available</button>
              <button onClick={() => applyToSelected('blocked')}   className="px-3 py-2 bg-red-600   text-white rounded-lg text-sm">Block</button>
              <button onClick={() => applyToSelected('sold-out')}  className="px-3 py-2 bg-gray-500  text-white rounded-lg text-sm">Sold Out</button>
            </>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(d => { const n=new Date(d); n.setMonth(d.getMonth()-1); return n; })} className="p-2 hover:bg-muted rounded-lg"><ChevronLeft className="h-5 w-5" /></button>
          <span className="font-medium">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
          <button onClick={() => setMonth(d => { const n=new Date(d); n.setMonth(d.getMonth()+1); return n; })} className="p-2 hover:bg-muted rounded-lg"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 border-t border-l border-border overflow-hidden rounded-lg">
          {Array.from({length: firstDay}).map((_,i) => <div key={`e${i}`} className="border-b border-r border-border min-h-[68px] bg-muted/10" />)}
          {Array.from({length: daysInMonth}, (_,i) => {
            const day = i + 1;
            const ds  = `${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const s   = slot(ds);
            const st: SlotStatus = s?.status ?? 'available';
            const past = ds < today;
            const isS  = sel.includes(ds);
            return (
              <div key={ds}
                onClick={() => !past && selecting && setSel(p => isS ? p.filter(x=>x!==ds) : [...p, ds])}
                className={`border-b border-r border-border min-h-[68px] p-1.5 transition-colors ${past?'opacity-40 bg-muted/10':selecting?'cursor-pointer hover:bg-primary/5':''} ${isS?'ring-2 ring-inset ring-primary bg-primary/10':''}`}>
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-xs font-medium ${ds===today?'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center':''}`}>{day}</span>
                  {!past && <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${SCC[st]}`}>
                    {st==='available'?(s?.available ?? room?.available ?? '—'):'✗'}
                  </span>}
                </div>
                {!past && st==='available' && s && (
                  <input type="number" min="0" max={room?.available??99}
                    className="w-full text-xs px-1 py-0.5 border border-border rounded bg-white text-center"
                    value={s.available}
                    onClick={e=>e.stopPropagation()}
                    onChange={e => setOneSlot(ds, 'available', +e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between mt-4 gap-3">
          <div className="flex gap-3 text-xs flex-wrap">
            {(Object.keys(SCC) as SlotStatus[]).map(s => <span key={s} className={`px-2 py-1 rounded ${SCC[s]}`}>{s}</span>)}
            <span className="text-muted-foreground">{selecting ? 'Click dates to select, then apply status' : 'Click "Select Dates" to batch-update'}</span>
          </div>
          <button onClick={saveAll} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      {/* Bulk date-range update */}
      <div className="bg-white rounded-lg border border-border p-5">
        <h3 className="font-medium mb-4">Bulk Update by Date Range</h3>
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <div><label className="block text-sm mb-1">Start Date</label>
            <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={bulkStart} onChange={e=>setBulkStart(e.target.value)} /></div>
          <div><label className="block text-sm mb-1">End Date</label>
            <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={bulkEnd} onChange={e=>setBulkEnd(e.target.value)} /></div>
          <div><label className="block text-sm mb-1">Status</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={bulkStat} onChange={e=>setBulkStat(e.target.value as SlotStatus)}>
              <option value="available">Available</option>
              <option value="blocked">Blocked</option>
              <option value="sold-out">Sold Out</option>
            </select></div>
          {bulkStat==='available' && <div><label className="block text-sm mb-1">Qty Available</label>
            <input type="number" min="0" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={bulkQty} onChange={e=>setBulkQty(+e.target.value)} /></div>}
          <button onClick={applyBulk} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 h-fit">Apply</button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Changes save immediately and sync with the live booking system.</p>
      </div>
    </div>
  );
}
