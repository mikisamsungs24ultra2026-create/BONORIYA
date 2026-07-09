/**
 * BonoriyaAI — Intelligent virtual assistant for the Bonoriya website.
 * Replaces the WhatsApp floating button with a branded AI chat widget.
 *
 * Architecture:
 *   • Knowledge-base matcher (pattern → canned answer + optional page nav)
 *   • Quick-action buttons that navigate directly
 *   • Escalation path → Contact Us page for complex queries
 *   • Fully self-contained; requires only `setCurrentPage` prop
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Send, Sparkles, ChevronDown, Phone, GripVertical } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  setCurrentPage: (page: string) => void;
}

type Role = 'ai' | 'user';

interface Message {
  id: string;
  role: Role;
  text: string;
  actions?: QuickAction[];
  navHint?: string; // page to navigate when this message carries a nav CTA
}

interface QuickAction {
  label: string;
  page?: string;   // navigate to this page
  query?: string;  // OR feed this as a user query
}

// ── Knowledge base ────────────────────────────────────────────────────────────

interface KBEntry {
  patterns: RegExp[];
  answer: string;
  page?: string; // suggest navigating here
  showContact?: boolean;
}

const KB: KBEntry[] = [
  // ── Greetings ──
  {
    patterns: [/^(hi|hello|hey|namaste|good (morning|afternoon|evening))/i],
    answer: "Hello! 👋 Great to hear from you. I'm Bonoriya AI — here to help with stays, day trips, prefab cottages, and anything else about the Bonoriya platform. What would you like to know?",
  },

  // ── Book Stays ──
  {
    patterns: [/book.*(stay|hotel|room|resort|homestay)|stay.*(book|reserv|availab)|find.*(hotel|resort|homestay|room)/i],
    answer: "🏨 **Book Stays**\n\nThrough Bonoriya you can book:\n• Hotels, resorts & boutique homestays\n• Eco lodges & nature retreats\n• Properties across Assam, Meghalaya, Arunachal Pradesh, Nagaland & all 8 Northeast states\n\nTo explore and book, head to our **Book Stays** page — you can filter by location, dates, and guest count.",
    page: 'book-stays',
  },

  // ── Day Trips ──
  {
    patterns: [/day.?trip|bonoriya agro|jimbrigaon|halher|meghalaya.*day|day.*tour|picnic/i],
    answer: "🌿 **Day Trip Experiences**\n\nBonoriya Agro Eco Tourism at Jimbrigaon, Halher, Meghalaya (≈50 km from Guwahati) is our flagship day trip property:\n• Trek to organic Khasi orange farm\n• Scenic waterfall hike\n• Traditional Assamese cuisine\n• Live Khasi folk music performance\n\nPricing starts from ₹1,000/person. Booking is instant — select your date and guest count.",
    page: 'day-trip',
  },

  // ── Prefab ──
  {
    patterns: [/prefab|modular|cottage|barnhouse|a.?frame|glamping.?pod|prefabricated|construct.*house|build.*resort/i],
    answer: "🏡 **Prefabricated Cottages & Structures**\n\nBonoriya is a leading prefab manufacturer in Northeast India. Our range includes:\n• **Glamping Pod** — studio, luxury single-room\n• **1 BHK Barnhouse** — eco-friendly, quick installation\n• **A-Frame Cottage** — iconic silhouette, weather-resistant\n• Custom modular resort structures\n\nAll structures are designed for any terrain, fully customisable, and can be installed in weeks not months. Contact us for a free quote.",
    page: 'prefab',
  },

  // ── Our Properties / Destinations ──
  {
    patterns: [/our.?propert|destination|listing|where.*stay|travel.*northeast|northeast.*travel|assam|meghalaya|arunachal|nagaland|manipur|mizoram|tripura|sikkim/i],
    answer: "🌄 **Properties & Destinations**\n\nBonoriya curates verified stays across all 8 Northeast Indian states:\n• Assam — near Kaziranga, Majuli, Brahmaputra riverbank, tea estates\n• Meghalaya — Shillong, Cherrapunji, Mawlynnong, Dawki, living root bridges\n• Arunachal Pradesh — Tawang, Ziro Valley, remote mountain retreats\n• Nagaland, Manipur, Mizoram, Tripura, Sikkim — authentic cultural homestays\n\nEvery property is personally verified by our team.",
    page: 'our-properties',
  },

  // ── Pricing / Booking Cost ──
  {
    patterns: [/price|pricing|cost|rate|fee|charge|how much|tariff/i],
    answer: "💰 **Pricing**\n\nPricing varies by property. Some key reference points:\n• Day Trip packages: ₹1,000–₹1,500 per person\n• Partner properties: pricing set by each property owner, visible on the listing\n• Prefab structures: custom quote based on design, size & terrain\n• No hidden charges — full amount due at check-in (no advance for hotel stays)\n\nFor a custom prefab quote, please contact us directly.",
  },

  // ── Payment ──
  {
    patterns: [/pay|payment|advance|deposit|refund|cancel/i],
    answer: "💳 **Payment & Cancellation**\n\n**Hotel & Homestay Stays:**\n• Full payment at check-in — no advance required\n• Cancellation: notify the property directly\n\n**Day Trips:**\n• 40% advance required at time of booking\n• Remaining 60% payable on arrival\n\n**Prefab Projects:**\n• Milestone-based payment as agreed in the project contract\n\nFor specific cancellation policies, please refer to the property listing or contact our team.",
  },

  // ── Booking process ──
  {
    patterns: [/how.*(book|reserv)|booking.*(process|work|step)/i],
    answer: "📋 **How to Book**\n\n1. Go to **Book Stays** (or Day Trip Booking)\n2. Search by location, check-in/check-out dates, and number of guests\n3. Browse verified listings and select a property\n4. Fill in your guest details\n5. Confirm your booking — you'll receive a confirmation email immediately\n\nFor day trips, a 40% advance is required to confirm your slot.",
    page: 'book-stays',
  },

  // ── Partner Registration ──
  {
    patterns: [/partner.*(register|join|list|sign.?up|apply)|list.*property|register.*property|become.?a.?partner/i],
    answer: "🤝 **Become a BONORIYA Partner**\n\nListing your property on BONORIYA is free and straightforward:\n1. Click **Partner Login** and register your account\n2. Submit your property details for review\n3. Our team verifies and approves within 24–48 hours\n4. Go live and start receiving bookings\n\n**Commission:** 10% on each confirmed booking for Associated properties. BONORIYA Own properties carry no commission.",
    page: 'partner-login',
  },

  // ── Commission / GST ──
  {
    patterns: [/commission|gst|tax|deduction|payout|earning|revenue.*(partner|property)/i],
    answer: "📊 **Commission & GST Structure**\n\n**Associated Properties:**\n• Commission on Booking: 10% of booking amount\n• GST on Commission: 18% of commission\n• Net payout = Booking amount − commission − GST\n\n**BONORIYA Own Properties:**\n• No Commission on Booking\n• No GST on Commission\n• Full booking amount is retained\n\nInvoices are generated monthly. Payment due within 7 days of invoice receipt.",
  },

  // ── Partner Dashboard ──
  {
    patterns: [/partner.*(dashboard|panel|login|account|profile|manage)|dashboard/i],
    answer: "🔑 **Partner Dashboard**\n\nOnce approved, your Partner Dashboard gives you full control:\n• Manage property details, photos & room inventory\n• Set availability and pricing\n• View and respond to bookings\n• Track revenue, commissions & earnings\n• Download monthly invoices\n• Update policies and check-in/check-out times\n\nAccess it via the **Partner Login** button in the top navigation.",
    page: 'partner-login',
  },

  // ── Blogs ──
  {
    patterns: [/blog|article|journal|travel.?guide|read|story|stories/i],
    answer: "📝 **Journal & Travel Guides**\n\nBonoriya publishes travel stories, destination guides, and insider tips about Northeast India's most extraordinary places — from living root bridges in Meghalaya to the hornbill festivals of Nagaland.\n\nExplore our latest articles in the **Journal** section.",
    page: 'blogs',
  },

  // ── Contact / Support ──
  {
    patterns: [/contact|reach.*team|speak.*human|call.*bonoriya|email.*bonoriya|phone.*number|helpline|support.*(team|human)/i],
    answer: "📞 **Contact BONORIYA**\n\nYou can reach the Bonoriya team through:\n• **Phone:** +91-9864282966 · +91-9435855559 (Mon–Sat, 9 AM–6 PM)\n• **Email:** info@bonoriya.com\n• **Grievances:** grievance@bonoriya.com\n• **Office:** Kamakhya Mandir Rd, Bhutnath, Guwahati-10, Assam\n\nFor the fastest response, use the Contact Us form on our website.",
    page: 'contact',
  },

  // ── About Bonoriya ──
  {
    patterns: [/about.?bonoriya|what.?is.?bonoriya|who.*bonoriya|bonoriya.*mean/i],
    answer: "🌱 **About BONORIYA**\n\nBONORIYA is Northeast India's premium platform for offbeat travel and sustainable construction, established in Assam.\n\nWe operate across two pillars:\n• **Travel & Hospitality** — curated offbeat stays, eco resorts, and day trip experiences across all 8 Northeast states\n• **Prefab Manufacturing** — India's leading designer and manufacturer of prefabricated cottages, glamping pods, and modular resort structures\n\nOur mission: connect travellers with the Northeast's untouched beauty, while empowering local entrepreneurs to build lasting hospitality ventures.",
  },

  // ── Availability / Dates ──
  {
    patterns: [/availab|is.*open|when.*open|closed.*date|blocked/i],
    answer: "📅 **Availability**\n\nAvailability depends on the specific property. To check:\n• Go to **Book Stays** and enter your preferred dates\n• The system shows real-time availability for all listed properties\n• For Day Trips, the calendar shows open and closed dates per property\n\nIf your preferred date is unavailable, you can enquire directly with the property via the Contact Us form.",
    page: 'book-stays',
  },

  // ── Location / Maps ──
  {
    patterns: [/location|address|where.*property|direction|how.*reach|distance.*guwahati|map/i],
    answer: "📍 **Property Locations**\n\nAll Bonoriya properties include GPS coordinates and a Google Maps link on their listing page, so you can get precise directions.\n\nFor the Bonoriya Agro Eco Tourism Day Trip:\n• Located at Jimbrigaon, Halher, Meghalaya\n• Approximately 50 km from Guwahati\n• About 1.5 hours by road\n\nFor other properties, check the individual listing for directions.",
  },

  // ── Guest Support ──
  {
    patterns: [/guest|check.?in|check.?out|arrival|depart|room.*service|complaint/i],
    answer: "🏨 **Guest Support**\n\nFor check-in/check-out assistance:\n• Refer to the confirmation email sent at booking — it contains all property contact details\n• Check-in times are set by each property (typically 12 PM–2 PM)\n• Check-out is usually by 11 AM\n\nFor urgent issues during your stay, contact the property directly using the number in your booking confirmation. For unresolved issues, email grievance@bonoriya.com.",
  },
];

// ── Welcome message ───────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: 'welcome',
  role: 'ai',
  text: "👋 **Welcome to Bonoriya AI!**\n\nHello! I'm Bonoriya AI, your intelligent virtual assistant.\n\nI'm here to help you with everything related to Bonoriya, including:\n\n🏨 Hotels, Resorts & Homestays\n🌿 Day Trip Experiences\n🏡 Prefab Modular Houses & Cottages\n🌄 Destinations & Travel Planning\n🤝 Partner Support\n📝 Blogs & Travel Guides\n🌐 Website Navigation\n❓ General Enquiries\n\nHow can I assist you today?",
  actions: [
    { label: '🏨 Book a Stay',       page: 'book-stays' },
    { label: '🌿 Day Trips',         page: 'day-trip' },
    { label: '🏡 Prefab Structures', page: 'prefab' },
    { label: '🌄 Destinations',      page: 'our-properties' },
    { label: '🤝 Partner Support',   page: 'partner-login' },
    { label: '📝 Blogs',             page: 'blogs' },
    { label: '📞 Contact Bonoriya',  page: 'contact' },
  ],
};

const ESCALATION =
  "I'd be happy to help, but this enquiry requires assistance from our Bonoriya team. Please fill out the Contact Us form and one of our representatives will get back to you as soon as possible.";

// ── AI engine ─────────────────────────────────────────────────────────────────

function getBotResponse(input: string): { text: string; page?: string; showContact?: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { text: "Please type your question and I'll do my best to help!" };

  // Check KB
  for (const entry of KB) {
    if (entry.patterns.some(p => p.test(trimmed))) {
      return { text: entry.answer, page: entry.page, showContact: entry.showContact };
    }
  }

  // Escalation triggers
  const escalate = /quotation|quote|legal|lawsuit|financial|invest|complaint|refund.*(force|demand)|partner.*negotiat|specific.*price|custom.*deal|franchise/i;
  if (escalate.test(trimmed)) {
    return { text: ESCALATION, page: 'contact', showContact: true };
  }

  // Fallback
  return {
    text: `Thanks for your question! I may not have a specific answer for that just yet.\n\nFor the most accurate and up-to-date information, our team is always happy to help directly.\n\nYou can reach us at **info@bonoriya.com** or via the Contact Us form below.`,
    page: 'contact',
    showContact: true,
  };
}

// ── Markdown-lite renderer (bold, newlines) ───────────────────────────────────

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j}>{p}</strong> : p
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BonoriyaAI({ setCurrentPage }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [pulsing, setPulsing] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Draggable button position (persisted per device) ─────────────────────
  // Uses viewport-relative coords so the button repositions cleanly on
  // rotate / resize. Falls back to the default bottom-right corner.
  const STORAGE_KEY = 'bonoriya_ai_button_pos_v1';
  const BTN_SIZE = { w: 170, h: 52 };   // approximate collapsed button footprint
  const MARGIN = 12;

  const getViewport = () => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const defaultPos = useCallback(() => {
    const { w, h } = getViewport();
    return {
      x: Math.max(MARGIN, w - BTN_SIZE.w - MARGIN),
      y: Math.max(MARGIN, h - BTN_SIZE.h - MARGIN),
    };
  }, []);

  const [btnPos, setBtnPos] = useState<{ x: number; y: number }>(defaultPos);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean }>({ dx: 0, dy: 0, moved: false });

  // Load saved position on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        const { w, h } = getViewport();
        // Clamp to current viewport in case the screen shrank since last save
        setBtnPos({
          x: Math.min(Math.max(MARGIN, p.x), w - BTN_SIZE.w - MARGIN),
          y: Math.min(Math.max(MARGIN, p.y), h - BTN_SIZE.h - MARGIN),
        });
      }
    } catch { /* ignore */ }
  }, []);

  // Reposition on viewport resize / orientation change so the button never
  // ends up off-screen after a device rotation or window resize.
  useEffect(() => {
    const onResize = () => {
      setBtnPos(prev => {
        const { w, h } = getViewport();
        return {
          x: Math.min(Math.max(MARGIN, prev.x), w - BTN_SIZE.w - MARGIN),
          y: Math.min(Math.max(MARGIN, prev.y), h - BTN_SIZE.h - MARGIN),
        };
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Pointer drag handlers — works for mouse + touch via Pointer Events
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    dragRef.current = { dx: e.clientX - btnPos.x, dy: e.clientY - btnPos.y, moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const { w, h } = getViewport();
    const nx = Math.min(Math.max(MARGIN, e.clientX - dragRef.current.dx), w - BTN_SIZE.w - MARGIN);
    const ny = Math.min(Math.max(MARGIN, e.clientY - dragRef.current.dy), h - BTN_SIZE.h - MARGIN);
    // Detect real drag (>4px) so a plain click still opens the chat
    if (!dragRef.current.moved) {
      const dxAbs = Math.abs(e.clientX - (btnPos.x + dragRef.current.dx));
      const dyAbs = Math.abs(e.clientY - (btnPos.y + dragRef.current.dy));
      if (dxAbs > 4 || dyAbs > 4) dragRef.current.moved = true;
    }
    setBtnPos({ x: nx, y: ny });
  };
  const onPointerUp = () => {
    if (dragging) {
      if (dragRef.current.moved) {
        // Real drag → persist position
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(btnPos)); } catch { /* ignore */ }
      } else {
        // No drag → treat as click and toggle the chat window.
        // We do it here because setPointerCapture on the wrapper prevents
        // the native click event from reaching the child <button>.
        setOpen(o => !o);
      }
    }
    setDragging(false);
  };

  // Compute chat-window anchor so it opens near the button and never overflows.
  const chatAnchor = useMemo(() => {
    const { w, h } = getViewport();
    const isMobile = w < 640;
    // Mobile: full-width bottom sheet anchored just above the button
    if (isMobile) {
      return {
        left: MARGIN,
        top: undefined as number | undefined,
        bottom: Math.max(MARGIN, h - btnPos.y + 12),
        width: w - MARGIN * 2,
      };
    }
    // Desktop / tablet: 380px window aligned to button's right edge, opening up
    const winW = 380;
    const winH = Math.min(560, h - MARGIN * 2 - BTN_SIZE.h - 24);
    const left = Math.max(MARGIN, Math.min(btnPos.x + BTN_SIZE.w - winW, w - winW - MARGIN));
    const bottom = Math.max(MARGIN, h - btnPos.y + 12);
    return { left, bottom, top: undefined, width: winW, maxHeight: winH };
  }, [btnPos]);

  // Stop pulse after first open
  useEffect(() => {
    if (open) setPulsing(false);
  }, [open]);

  // Auto-scroll on new message
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, typing]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const navigate = (page: string) => {
    setCurrentPage(page);
    setOpen(false);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const { text: reply, page, showContact } = getBotResponse(text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: reply,
        actions: showContact ? [{ label: '📞 Contact Bonoriya', page: 'contact' }] : page ? [{ label: `Go to ${pageName(page)} →`, page }] : undefined,
      };
      setMessages(prev => [...prev, aiMsg]);
      setTyping(false);
    }, 800 + Math.random() * 400);
  };

  return (
    <>
      {/* ── Chat Window ── */}
      <div
        data-testid="bonoriya-ai-chat"
        className="fixed z-[60] flex flex-col"
        style={{
          left: chatAnchor.left,
          right: undefined,
          bottom: chatAnchor.bottom,
          top: chatAnchor.top,
          width: chatAnchor.width,
          maxHeight: (chatAnchor as any).maxHeight || 'calc(100vh - 120px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-border" style={{maxHeight: 'inherit'}}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-forest-900 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* AI avatar */}
              <div className="w-9 h-9 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4.5 w-4.5 text-forest-900" style={{width: 18, height: 18}} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight" style={{fontFamily: 'var(--font-body)'}}>Bonoriya AI</p>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  <span className="text-white/60 text-[11px]" style={{fontFamily: 'var(--font-body)'}}>Online · Always here to help</span>
                </span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <ChevronDown className="h-5 w-5 text-white/80" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none bg-[#F7F4EE]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] ${msg.role === 'user' ? '' : 'flex items-start gap-2.5'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles style={{width:13,height:13,color:'#0F2218'}} />
                    </div>
                  )}
                  <div>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-forest-900 text-white rounded-br-sm'
                          : 'bg-white text-foreground rounded-bl-sm shadow-sm border border-border/50'
                      }`}
                      style={{fontFamily: 'var(--font-body)'}}
                    >
                      {renderText(msg.text)}
                    </div>

                    {/* Action buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {msg.actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => action.page ? navigate(action.page) : action.query ? send(action.query) : null}
                            className="px-3 py-1.5 bg-white border border-border text-forest-900 text-[12px] font-medium rounded-full hover:bg-forest-900 hover:text-white hover:border-forest-900 transition-all duration-200 shadow-sm"
                            style={{fontFamily: 'var(--font-body)'}}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
                    <Sparkles style={{width:13,height:13,color:'#0F2218'}} />
                  </div>
                  <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-sm shadow-sm border border-border/50 flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-muted-foreground rounded-full inline-block"
                        style={{
                          animation: 'bounce 1.2s ease-in-out infinite',
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3.5 py-3 border-t border-border bg-white flex-shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything about Bonoriya…"
                className="flex-1 px-3.5 py-2.5 bg-secondary rounded-full text-sm border border-border focus:outline-none focus:ring-2 focus:ring-forest-900/30 placeholder-muted-foreground/60"
                style={{fontFamily: 'var(--font-body)'}}
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="w-9 h-9 flex items-center justify-center bg-forest-900 text-white rounded-full hover:bg-forest-900/85 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <Send style={{width:15,height:15}} />
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2" style={{fontFamily: 'var(--font-body)'}}>
              BONORIYA AI · Powered by BONORIYA Knowledge Base
            </p>
          </div>
        </div>
      </div>

      {/* ── Floating Button (draggable) ── */}
      <div
        data-testid="bonoriya-ai-button-wrap"
        className="fixed z-[60] select-none"
        style={{
          left: btnPos.x,
          top: btnPos.y,
          touchAction: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Drag handle (visual hint, top-left corner) */}
        <span
          className="absolute -top-1 -left-1 w-5 h-5 bg-white/95 rounded-full shadow flex items-center justify-center pointer-events-none border border-border"
          title="Drag to move"
          aria-hidden="true"
        >
          <GripVertical style={{ width: 12, height: 12, color: '#0F2218' }} />
        </span>
        <button
          data-testid="bonoriya-ai-toggle"
          type="button"
          onClick={(e) => {
            // Fallback for synthetic .click() invocations (e.g., automated
            // tests) — real user clicks are handled by the wrapper's
            // onPointerUp so that drag vs. click can be distinguished.
            if (!dragging && !dragRef.current.moved) setOpen(o => !o);
            e.stopPropagation();
          }}
          className="relative group flex items-center gap-2.5 pl-3.5 pr-4 h-13 bg-forest-900 text-white rounded-full shadow-xl hover:shadow-2xl transition-shadow duration-300"
          style={{ height: 52, transition: 'box-shadow 0.25s cubic-bezier(0.34,1.4,0.64,1)' }}
          title="Chat with Bonoriya AI (drag to move)"
        >
          {/* Pulse ring — shown until first open */}
          {pulsing && (
            <span className="absolute inset-0 rounded-full bg-forest-900 animate-ping opacity-20 pointer-events-none" />
          )}

          {/* Icon */}
          <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
            {open
              ? <X style={{width:15,height:15,color:'#0F2218'}} />
              : <Sparkles style={{width:15,height:15,color:'#0F2218'}} />
            }
          </div>

          {/* Label */}
          {!open && (
            <span className="text-sm font-semibold whitespace-nowrap pr-0.5" style={{fontFamily: 'var(--font-body)'}}>
              Bonoriya AI
            </span>
          )}
          {open && (
            <span className="text-sm font-semibold whitespace-nowrap pr-0.5" style={{fontFamily: 'var(--font-body)'}}>
              Close
            </span>
          )}

          {/* Gold glow on hover */}
          <span className="absolute inset-0 rounded-full ring-0 group-hover:ring-2 group-hover:ring-brand-gold/40 transition-all duration-300 pointer-events-none" />
        </button>

        {/* Notification dot — before first interaction */}
        {pulsing && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-gold rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[8px] text-forest-900 font-bold leading-none" style={{fontFamily: 'var(--font-body)'}}>1</span>
          </span>
        )}
      </div>

      {/* Bounce keyframe */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}

// Helper: human-readable page name for button labels
function pageName(page: string): string {
  const map: Record<string, string> = {
    'book-stays': 'Book Stays',
    'day-trip': 'Day Trips',
    'prefab': 'Prefab',
    'our-properties': 'Properties',
    'partner-login': 'Partner Dashboard',
    'blogs': 'Journal',
    'contact': 'Contact Us',
    'home': 'Homepage',
    'gateway': 'Explore',
  };
  return map[page] ?? page;
}
