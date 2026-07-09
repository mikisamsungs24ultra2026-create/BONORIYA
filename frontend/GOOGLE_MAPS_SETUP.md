# Google Maps Integration Setup

**Note:** Google Maps integration is **completely optional**. The application works perfectly without it, using regular text inputs for location search. Set up Google Maps only if you want enhanced autocomplete and interactive map features.

## Expected Console Warnings (Before Setup)

If you see these errors in the browser console before setting up Google Maps, **they are normal and can be ignored**:

- `Google Maps JavaScript API error: InvalidKeyMapError`
- `Autocomplete is not available to new customers` warning

The application will function normally with standard text inputs until you add a valid API key.

---

This application can use Google Maps for location autocomplete and property pin dropping. Follow these steps to set up the Google Maps API:

## 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs for your project:
   - **Maps JavaScript API** (for interactive maps)
   - **Places API** (for location autocomplete)
   - **Geocoding API** (for address to coordinates conversion)
4. Go to **Credentials** and create an API key
5. (Recommended) Restrict your API key:
   - Application restrictions: HTTP referrers (websites)
   - Add your website domain
   - API restrictions: Select only the three APIs listed above

## 2. Add API Key to Your Application

### Option 1: Environment Variable (Recommended for production)

1. Create a `.env` file in the root directory (copy from `.env.example`)
2. Add your API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
3. Restart your development server

### Option 2: Direct Code (For testing only)

1. Open `src/app/components/LocationAutocomplete.tsx`
2. Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key
3. Open `src/app/components/MapPinPicker.tsx`
4. Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key

**⚠️ Warning:** Never commit API keys directly in code. Use environment variables for production.

## 3. Features Using Google Maps

### Location Autocomplete
- **Homepage Search**: Users can search for locations with autocomplete suggestions
- **Book Stays Page**: Location search with proximity-based property filtering
- Uses the latest `PlaceAutocompleteElement` API (recommended by Google as of March 2025)

### Map Pin Picker
- **Partner Dashboard**: Property owners can drop a pin on Google Maps to set their exact location
- This enables:
  - Accurate property location display
  - Proximity-based search (finds properties within 200km of search location)
  - Better guest experience when finding properties

## 4. How Proximity Search Works

When a user selects a location from the autocomplete:
1. The system captures the coordinates (latitude/longitude)
2. Calculates distance to all active properties
3. Shows properties within 200km radius
4. Sorts results by distance (nearest first)

## 5. Pricing

Google Maps APIs have a free tier with usage limits:
- Maps JavaScript API: $7 per 1,000 loads (28,500 free loads per month)
- Places API Autocomplete: $2.83 per 1,000 requests (First $200 free each month)
- Geocoding API: $5 per 1,000 requests

For most small to medium websites, the free tier is sufficient. [Check current pricing](https://cloud.google.com/maps-platform/pricing)

## 6. Troubleshooting

### "Loading map..." appears indefinitely
- Check that your API key is correct
- Verify all three APIs are enabled in Google Cloud Console
- Check browser console for error messages

### Autocomplete not working
- Ensure Places API is enabled
- Check API key restrictions aren't blocking your domain
- Make sure you have a valid API key (not "YOUR_GOOGLE_MAPS_API_KEY")

### "This page can't load Google Maps correctly" or "InvalidKey" error
- Your API key may be incorrect or not set
- Billing might not be enabled on your Google Cloud project (required even for free tier)
- Check the browser console for specific error messages
- Verify the API key is properly set in your `.env` file

### "Google Maps API key not configured" message
- You haven't set up your API key yet
- The application will work with basic text input, but autocomplete and maps won't function
- Follow the setup steps above to enable Google Maps features

## Support

For Google Maps API issues, refer to:
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Google Cloud Console](https://console.cloud.google.com/)
