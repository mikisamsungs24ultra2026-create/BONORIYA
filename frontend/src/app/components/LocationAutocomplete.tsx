import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, placeDetails?: { lat: number; lng: number; formattedAddress: string }) => void;
  placeholder?: string;
  className?: string;
}

// Add your Google Maps API key here
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Enter location",
  className = ""
}: LocationAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip loading if no valid API key - don't even try to load Google Maps
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      // Silently skip - no error needed, just use regular input
      return;
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const handleLoad = () => setIsLoaded(true);
      const handleError = () => setError('Failed to load Google Maps');

      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);

      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };
    }

    // Load Google Maps script with async
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('Failed to load Google Maps');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !inputRef.current) return;
    if (!window.google?.maps?.places?.PlaceAutocompleteElement) return;

    try {
      // Use the new PlaceAutocompleteElement
      const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: 'in' }, // Restrict to India
      });

      // Style the autocomplete element
      autocompleteElement.id = 'place-autocomplete';

      // Listen for place selection
      autocompleteElement.addEventListener('gmp-placeselect', async (event: any) => {
        const place = event.place;

        if (place.location) {
          const lat = place.location.lat();
          const lng = place.location.lng();
          const formattedAddress = place.formattedAddress || place.displayName || '';

          onChange(formattedAddress, { lat, lng, formattedAddress });

          // Update the regular input with the selected value
          if (inputRef.current) {
            inputRef.current.value = formattedAddress;
          }
        }
      });

      // Replace input with autocomplete element
      if (inputRef.current && containerRef.current) {
        inputRef.current.style.display = 'none';
        containerRef.current.appendChild(autocompleteElement);

        // Apply styles to match the input
        const input = autocompleteElement.querySelector('input');
        if (input) {
          input.className = `w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`;
          input.placeholder = placeholder;
          input.value = value;
        }
      }

      return () => {
        autocompleteElement.remove();
      };
    } catch (err) {
      console.error('Error initializing PlaceAutocompleteElement:', err);
      setError('Failed to initialize autocomplete');
    }
  }, [isLoaded, onChange, placeholder, className]);

  // If there's an error or no API key, show regular input (no error message for missing key)
  if (error || !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return (
      <div className="space-y-2">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-orange-600">
            <AlertCircle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      />
    </div>
  );
}
