import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';

interface MapPinPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

export default function MapPinPicker({ initialLat, initialLng, onLocationSelect }: MapPinPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip loading if no valid API key - show error message for this component
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setError('Google Maps API key not configured. Please add your API key to use this feature.');
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
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
    if (!isLoaded || !mapRef.current) return;

    // Default to Guwahati, Assam if no initial coordinates
    const defaultLat = initialLat || 26.1445;
    const defaultLng = initialLng || 91.7362;

    // Initialize map
    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: false,
    });

    // Add marker
    const markerInstance = new google.maps.Marker({
      position: { lat: defaultLat, lng: defaultLng },
      map: mapInstance,
      draggable: true,
      title: 'Drag to set property location',
    });

    // Get initial address
    getAddressFromCoordinates(defaultLat, defaultLng);

    // Listen for marker drag
    markerInstance.addListener('dragend', () => {
      const position = markerInstance.getPosition();
      if (position) {
        const lat = position.lat();
        const lng = position.lng();
        getAddressFromCoordinates(lat, lng);
        onLocationSelect(lat, lng, selectedAddress);
      }
    });

    // Listen for map clicks
    mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        markerInstance.setPosition(e.latLng);
        getAddressFromCoordinates(lat, lng);
        onLocationSelect(lat, lng, selectedAddress);
      }
    });

    setMap(mapInstance);
    setMarker(markerInstance);
  }, [isLoaded]);

  const getAddressFromCoordinates = (lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address;
        setSelectedAddress(address);
        onLocationSelect(lat, lng, address);
      }
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (map && marker) {
            const newPosition = { lat, lng };
            map.setCenter(newPosition);
            marker.setPosition(newPosition);
            getAddressFromCoordinates(lat, lng);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please ensure location services are enabled.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (error) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
          <p className="text-foreground mb-2">Google Maps Not Available</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">
            See <code className="bg-muted px-1 py-0.5 rounded">GOOGLE_MAPS_SETUP.md</code> for setup instructions
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Click on the map or drag the marker to set your property location</p>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Navigation className="h-4 w-4" />
          Use My Location
        </button>
      </div>

      <div ref={mapRef} className="w-full h-96 rounded-lg border border-border" />

      {selectedAddress && (
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Selected Location:</p>
            <p className="text-sm text-muted-foreground">{selectedAddress}</p>
          </div>
        </div>
      )}
    </div>
  );
}
