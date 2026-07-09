import bonoriyaLogo from '../../imports/Bonoriya_2___1_.png';

interface FooterProps {
  setCurrentPage: (page: string, section?: string) => void;
}

export default function Footer({ setCurrentPage }: FooterProps) {
  return (
    <footer className="bg-forest-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={bonoriyaLogo} alt="BONORIYA" className="h-20" />
            </div>
            <p className="text-sm text-white/80">
              Your gateway to authentic North East India experiences and sustainable living solutions.
            </p>
          </div>
          <div>
            <h4 className="mb-4">Tourism</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><button onClick={() => setCurrentPage('book-stays')} className="hover:text-white">Book Stays</button></li>
              <li><button onClick={() => setCurrentPage('our-properties')} className="hover:text-white">Our Properties</button></li>
              <li><button onClick={() => setCurrentPage('destinations')} className="hover:text-white">Destinations</button></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4">Prefab Solutions</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><button onClick={() => setCurrentPage('prefab', 'designs')} className="hover:text-white">Our Designs</button></li>
              <li><button onClick={() => setCurrentPage('prefab', 'quote')} className="hover:text-white">Custom Solutions</button></li>
              <li><button onClick={() => setCurrentPage('prefab', 'gallery')} className="hover:text-white">Gallery</button></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><button onClick={() => setCurrentPage('home')} className="hover:text-white">About Us</button></li>
              <li><button onClick={() => setCurrentPage('partner-login')} className="hover:text-white">Partner Login</button></li>
              <li><button onClick={() => setCurrentPage('contact')} className="hover:text-white">Contact</button></li>
              <li><button onClick={() => setCurrentPage('blogs')} className="hover:text-white">Blogs</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 pt-8 text-center text-sm text-white/60">
          <p>&copy; 2026 BONORIYA LLP. ALL RIGHTS RESERVED.</p>
          <p className="mt-1">Designed for Nature, Culture & Tourism</p>
        </div>
      </div>
    </footer>
  );
}
