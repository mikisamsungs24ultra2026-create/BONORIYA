# BONORIYA

A comprehensive booking platform and property management system for eco-friendly stays and prefabricated cottage manufacturing in Northeast India.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will run at the URL shown in your preview window.

## Features

- **Public Booking Platform**: Search and book unique properties across Northeast India
- **Partner Portal**: Property owners can manage listings, bookings, pricing, and photos
- **Admin Dashboard**: Complete management system for properties, bookings, invoices, and day trips
- **Day Trip Bookings**: Specialized booking system for Bonoriya Agro Eco Tourism
- **Google Maps Integration**: Location autocomplete and property pin dropping (optional)

## Google Maps Setup (Optional)

The application works perfectly without Google Maps, using regular text inputs for location search. However, for enhanced features like autocomplete and interactive maps, you can set up Google Maps:

1. See `GOOGLE_MAPS_SETUP.md` for detailed instructions
2. Create a `.env` file from `.env.example`
3. Add your Google Maps API key

**Note:** If you see Google Maps-related errors in the browser console before setting up an API key, this is expected and can be safely ignored. The application will use standard text inputs until you configure Google Maps.

## Project Structure

```
src/
├── app/
│   ├── App.tsx                 # Main application with navigation
│   └── components/
│       ├── BookStays.tsx       # Tourist booking interface
│       ├── PartnerDashboard.tsx # Partner property management
│       ├── AdminDashboard.tsx   # Admin management system
│       ├── DayTripBooking.tsx   # Day trip booking system
│       ├── OurProperties.tsx    # Featured properties showcase
│       ├── LocationAutocomplete.tsx # Google Maps autocomplete
│       ├── MapPinPicker.tsx     # Interactive map for partners
│       └── ...other components
├── imports/                    # Images and assets
└── styles/                     # CSS and theme files
```

## Key Pages

- **Home**: Hero section with search, featured properties, and company info
- **Book Stays**: Property search with filters and booking
- **Partner Login**: Property management dashboard
- **Admin**: Complete system management (access at `/admin`)
- **Our Properties**: Showcase of handpicked stays
- **Day Trip**: Bonoriya Agro Eco Tourism booking
- **Blogs**: Travel stories and updates
- **Contact**: Get in touch

## Environment Variables

```env
# Google Maps API (Optional)
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge) - latest 2 versions

## Support

For issues or questions, contact:
- Email: info@bonoriya.com
- Phone: +91-9864282966, +91-9435855559

## License

© 2026 BONORIYA LLP. All Rights Reserved.
