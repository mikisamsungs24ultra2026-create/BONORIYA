import { useState } from 'react';
import { BedDouble, Building2, Mountain, BookOpen, Home, ArrowRight } from 'lucide-react';

interface GatewayPageProps {
  setCurrentPage: (page: string) => void;
}

const TILES = [
  {
    id: 'book-stays',
    Icon: BedDouble,
    label: 'Book Stays',
    sub: 'Hotels, resorts & homestays',
    accent: '#F0A010',
  },
  {
    id: 'prefab',
    Icon: Building2,
    label: 'Prefab Structures',
    sub: 'Modular houses & cottages',
    accent: '#F0A010',
  },
  {
    id: 'our-properties',
    Icon: Mountain,
    label: 'Our Properties',
    sub: 'Destinations & listings',
    accent: '#F0A010',
  },
  {
    id: 'blogs',
    Icon: BookOpen,
    label: 'Journal',
    sub: 'Stories & travel guides',
    accent: '#F0A010',
  },
  {
    id: 'home',
    Icon: Home,
    label: 'Homepage',
    sub: 'Back to main site',
    accent: '#F0A010',
  },
] as const;

export default function GatewayPage({ setCurrentPage }: GatewayPageProps) {
  const [pressed, setPressed] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setPressed(id);
    setTimeout(() => {
      setPressed(null);
      setCurrentPage(id);
    }, 140);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center bg-background px-5 py-16">

      {/* Header */}
      <div className="text-center mb-14 max-w-lg">
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-5" style={{fontFamily: 'var(--font-body)'}}>
          Explore BONORIYA
        </p>
        <h1
          className="text-4xl sm:text-5xl text-foreground mb-4 leading-tight"
          style={{fontFamily: 'var(--font-display)', fontWeight: 400}}
        >
          Where would you like
          <br /><em className="italic text-muted-foreground">to go today?</em>
        </h1>
        <div className="w-12 h-px bg-brand-gold mx-auto" />
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl">
        {TILES.map(({ id, Icon, label, sub }) => (
          <GatewayTile
            key={id}
            id={id}
            Icon={Icon}
            label={label}
            sub={sub}
            pressed={pressed === id}
            onClick={() => handleClick(id)}
          />
        ))}
      </div>

      {/* Footer wordmark */}
      <p
        className="mt-14 text-[10px] tracking-[0.3em] uppercase select-none text-muted-foreground/40"
        style={{fontFamily: 'var(--font-body)'}}
      >
        BONORIYA &nbsp;·&nbsp; Northeast India
      </p>
    </div>
  );
}

interface TileProps {
  id: string;
  Icon: React.ElementType;
  label: string;
  sub: string;
  pressed: boolean;
  onClick: () => void;
}

function GatewayTile({ Icon, label, sub, pressed, onClick }: TileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="group relative flex flex-col items-start text-left rounded-2xl border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-900 select-none overflow-hidden"
      style={{
        padding: '24px 22px 22px',
        borderColor: hovered ? 'rgba(15,34,24,0.20)' : 'var(--border)',
        boxShadow: hovered
          ? '0 16px 40px rgba(15,34,24,0.10), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        transform: pressed ? 'scale(0.96)' : hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(0.34,1.4,0.64,1)',
      }}
    >
      {/* Gold accent line on hover */}
      <span
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: '#F0A010',
          transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 0.25s ease',
          borderRadius: '2px 2px 0 0',
        }}
      />

      {/* Icon */}
      <div
        className="mb-5"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovered ? '#0F2218' : '#EAE6DC',
          transition: 'background 0.22s ease',
        }}
      >
        <Icon
          size={22}
          strokeWidth={1.6}
          style={{
            color: hovered ? '#F0A010' : '#0F2218',
            transition: 'color 0.2s ease',
          }}
        />
      </div>

      {/* Text */}
      <p
        className="text-sm font-semibold leading-tight mb-1"
        style={{
          fontFamily: 'var(--font-body)',
          color: hovered ? '#0F2218' : '#1A1A16',
        }}
      >
        {label}
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{
          fontFamily: 'var(--font-body)',
          color: hovered ? '#6B6858' : '#9A9480',
        }}
      >
        {sub}
      </p>

      {/* Arrow on hover */}
      <ArrowRight
        size={14}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          color: '#F0A010',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(-4px)',
          transition: 'all 0.2s ease',
        }}
      />
    </button>
  );
}
