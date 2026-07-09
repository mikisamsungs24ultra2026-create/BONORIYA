import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, CheckCircle } from 'lucide-react';
import { getPropertyAvailability, savePropertyAvailability, type DayTripDateStatus } from '../utils/auth';

interface DayTripCalendarProps {
  /** UUID of the day_trip_properties record. Required for per-property availability. */
  propertyId: string;
  propertyName?: string;
}

function dateRange(s: string, e: string): string[] {
  const out: string[] = [];
  const d = new Date(s);
  while (d <= new Date(e)) { out.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1); }
  return out;
}

export default function DayTripCalendar({ propertyId, propertyName }: DayTripCalendarProps) {
  const [month,  setMonth]  = useState(new Date());
  const [slots,  setSlots]  = useState<DayTripDateStatus[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState('');
  const [bStart, setBStart] = useState('');
  const [bEnd,   setBEnd]   = useState('');
  const [bStat,  setBStat]  = useState<'available' | 'closed'>('available');

  // Load this property's availability from Supabase on mount / propertyId change
  useEffect(() => {
    if (!propertyId) return;
    getPropertyAvailability(propertyId).then(setSlots);
  }, [propertyId]);

  const show = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const today = new Date().toISOString().split('T')[0];
  const status = (date: string): 'available' | 'closed' =>
    slots.find(s => s.date === date)?.status ?? 'available';

  const upsert = (updates: DayTripDateStatus[]) => {
    const base = [...slots];
    for (const s of updates) {
      const i = base.findIndex(x => x.date === s.date);
      if (i >= 0) base[i] = s; else base.push(s);
    }
    return base;
  };

  const toggle = (date: string) => {
    const next: 'available' | 'closed' = status(date) === 'available' ? 'closed' : 'available';
    const updated = upsert([{ date, status: next }]);
    setSlots(updated);
    savePropertyAvailability(propertyId, [{ date, status: next }]);
  };

  const save = async () => {
    setSaving(true);
    await savePropertyAvailability(propertyId, slots);
    setSaving(false);
    show(`Availability saved for ${propertyName || 'this property'}!`);
  };

  const applyBulk = async () => {
    if (!bStart || !bEnd) return;
    const dates = dateRange(bStart, bEnd);
    const updates: DayTripDateStatus[] = dates.map(date => ({ date, status: bStat }));
    const updated = upsert(updates);
    setSlots(updated);
    await savePropertyAvailability(propertyId, updates);
    show(`${dates.length} dates marked as ${bStat}`);
  };

  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl bg-green-600 text-white text-sm">
          <CheckCircle className="h-5 w-5" /> {toast}
        </div>
      )}

      <div className="bg-muted/10 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h4 className="font-medium text-sm">Availability Calendar</h4>
            {propertyName && <p className="text-xs text-muted-foreground">{propertyName}</p>}
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Available</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" />Closed</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Click any date to toggle availability. Guests cannot book on Closed dates.</p>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(d => { const n = new Date(d); n.setMonth(d.getMonth() - 1); return n; })}
            className="p-1.5 hover:bg-muted rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
          <span className="font-medium text-sm">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setMonth(d => { const n = new Date(d); n.setMonth(d.getMonth() + 1); return n; })}
            className="p-1.5 hover:bg-muted rounded-lg"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 border-t border-l border-border rounded-lg overflow-hidden">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="border-b border-r border-border min-h-[48px] bg-muted/10" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const ds = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const st = status(ds);
            const past = ds < today;
            return (
              <div key={ds}
                onClick={() => !past && toggle(ds)}
                className={`border-b border-r border-border min-h-[48px] p-1 flex flex-col items-center justify-start gap-0.5 transition-colors
                  ${past ? 'opacity-40 bg-muted/10 cursor-not-allowed'
                    : st === 'available' ? 'bg-green-50 cursor-pointer hover:bg-green-100'
                    : 'bg-red-50 cursor-pointer hover:bg-red-100'}`}>
                <span className={`text-xs font-medium ${ds === today
                  ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]' : ''}`}>
                  {day}
                </span>
                <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold
                  ${st === 'available' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {st === 'available' ? '✓ Open' : '✗ Closed'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-3">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Calendar'}
          </button>
        </div>
      </div>

      {/* Bulk date range update */}
      <div className="bg-muted/10 rounded-xl border border-border p-4">
        <h4 className="font-medium text-sm mb-3">Bulk Date Range Update</h4>
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div><label className="block text-xs mb-1">Start Date</label>
            <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              value={bStart} onChange={e => setBStart(e.target.value)} /></div>
          <div><label className="block text-xs mb-1">End Date</label>
            <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              value={bEnd} onChange={e => setBEnd(e.target.value)} /></div>
          <div><label className="block text-xs mb-1">Status</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm"
              value={bStat} onChange={e => setBStat(e.target.value as 'available' | 'closed')}>
              <option value="available">Available for Booking</option>
              <option value="closed">Closed / Unavailable</option>
            </select></div>
          <button onClick={applyBulk}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 h-fit">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
