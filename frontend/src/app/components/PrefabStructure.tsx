import { useState, useEffect, useRef } from 'react';
import { Building2, CheckCircle, Clock, Home, Mail, Phone, Shield, Zap, Leaf, DollarSign, Users, Mountain, X } from 'lucide-react';
import prefabHero from '../../imports/prefab-solutions.png';
import barnhouseGroundFloor from '../../imports/Burn_House__1BHK_.png';
import barnhouseElevation from '../../imports/Burn_House__1_BHK__Architectural_.png';
import glampingPodCottage from '../../imports/Glamping_Pod__Single_Room_Cottage_.png';
import glampingPodArchitectural from '../../imports/Glamping_pod__Single_Room_Cottage__Architectural_design_.png';
import alpineVilla from '../../imports/Alpine_Villa.png';
import alpineVillaArchitectural from '../../imports/Alpine_Villa_Architectural_Design.png';
import aFrame1BHK from '../../imports/A_Frame_1_BHK.png';
import aFrameArchitectural from '../../imports/A_Frame_Architectural_Design.png';
import baliSingleRoom from '../../imports/Bali_Single_Room_Cottages.png';
import baliSingleRoomArchitectural from '../../imports/Bali_Single_Room_Cottages_Architectural_Design.png';
import aFrame2BHK from '../../imports/A-Frame__2BHK_.png';
import aFrame2BHKArchitectural from '../../imports/Modular_A-Frame__2BHK__Architectural_Design_.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PrefabStructureProps {
  setCurrentPage: (page: string) => void;
  section?: string;
}

export default function PrefabStructure({ setCurrentPage, section }: PrefabStructureProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    projectType: '',
    location: '',
    message: ''
  });
  const [selectedImage, setSelectedImage] = useState<{ image: string; title: string; location: string } | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  const designsRef = useRef<HTMLElement>(null);
  const quoteRef = useRef<HTMLElement>(null);

  // All designs array
  const allDesigns = [
    {
      image: barnhouseGroundFloor,
      title: '1 BHK Barnhouse',
      location: 'Design'
    },
    {
      image: barnhouseElevation,
      title: '1 BHK Barnhouse',
      location: 'Ground Floor & First Floor Elevation View'
    },
    {
      image: glampingPodCottage,
      title: 'Glamping Pod',
      location: 'Single Room Cottage'
    },
    {
      image: glampingPodArchitectural,
      title: 'Glamping pod',
      location: 'Single Room Architectural Design'
    },
    {
      image: alpineVilla,
      title: 'Alpine Villa',
      location: 'Alpine Villa'
    },
    {
      image: alpineVillaArchitectural,
      title: 'Alpine Villa',
      location: 'Architectural Design'
    },
    {
      image: aFrame1BHK,
      title: 'A Frame 1 BHK Cottage',
      location: 'A Frame 1 BHK Cottage'
    },
    {
      image: aFrameArchitectural,
      title: 'A Frame, 1BHK',
      location: 'Architectural Design'
    },
    {
      image: baliSingleRoom,
      title: 'Bali Single Room Cottage',
      location: 'Bali Single Room Cottage'
    },
    {
      image: baliSingleRoomArchitectural,
      title: 'Bali Single Room Cottages',
      location: 'Architectural Design'
    },
    {
      image: aFrame2BHK,
      title: 'A-Frame 2BHK Cottage',
      location: 'A-Frame 2BHK Cottage'
    },
    {
      image: aFrame2BHKArchitectural,
      title: 'Modular A-Frame 2BHK Cottage',
      location: 'Architectural Design'
    }
  ];

  // Filter only design photos (not architectural)
  const galleryDesigns = allDesigns.filter(design =>
    !design.location.toLowerCase().includes('architectural') &&
    !design.location.toLowerCase().includes('elevation')
  );

  // Scroll to section on mount or when section changes
  useEffect(() => {
    if (section === 'designs' && designsRef.current) {
      designsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (section === 'quote' && quoteRef.current) {
      quoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (section === 'gallery') {
      setShowGallery(true);
    }
  }, [section]);

  const services = [
    {
      title: 'Prefabricated Cottages',
      description: 'Eco-friendly cottages perfect for resorts, homestays, and eco-tourism properties',
      icon: Home,
      features: ['Quick Installation', 'Customizable Design', 'Weather Resistant']
    },
    {
      title: 'Modular Homes',
      description: 'Complete residential solutions with modern amenities and sustainable materials',
      icon: Building2,
      features: ['Energy Efficient', 'Durable Construction', 'Cost Effective']
    },
    {
      title: 'Glamping Pods',
      description: 'Luxury camping experiences with comfortable, stylish prefab structures',
      icon: Mountain,
      features: ['Luxury Design', 'Nature Integration', 'Year-round Use']
    },
    {
      title: 'Resort Structures',
      description: 'Large-scale hospitality solutions for resorts and eco-tourism ventures',
      icon: Users,
      features: ['Scalable Design', 'Premium Materials', 'Fast Deployment']
    },
    {
      title: 'Site Offices',
      description: 'Temporary or permanent office spaces for construction sites and projects',
      icon: Zap,
      features: ['Mobile Solutions', 'Quick Setup', 'Functional Design']
    },
    {
      title: 'Custom Structures',
      description: 'Bespoke prefabricated buildings tailored to your specific requirements',
      icon: Shield,
      features: ['Tailored Design', 'Unique Solutions', 'Professional Support']
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'Faster Construction',
      description: '50-70% faster than traditional construction methods'
    },
    {
      icon: DollarSign,
      title: 'Cost-Effective',
      description: 'Reduced labor and material costs with efficient manufacturing'
    },
    {
      icon: Shield,
      title: 'Superior Quality',
      description: 'Factory-controlled production ensures consistent high quality'
    },
    {
      icon: Leaf,
      title: 'Eco-Friendly',
      description: 'Sustainable materials and minimal construction waste'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Prefab inquiry submitted:', formData);
    alert('Thank you for your inquiry! Our team will contact you within 24 hours.');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="w-full bg-black">
        <ImageWithFallback
          src={prefabHero}
          alt="BONORIYA Prefabricated Solutions"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Description Section - Just Below Hero */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl mb-6">BONORIYA Prefabricated Solutions</h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            BONORIYA Prefabricated Solutions specializes in the design, manufacturing, and installation of high-quality prefabricated cottages, modular homes, glamping pods, resorts, site offices, and custom structures. We deliver faster construction, superior quality, and cost-effective building solutions across North Eastern States of India.
          </p>
          <button
            onClick={() => {
              const contactForm = document.getElementById('contact-form');
              contactForm?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-lg font-medium"
          >
            Get a Quote
          </button>
        </div>
      </section>

      {/* Why Choose Prefab */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl mb-4">Why Choose Prefabricated Solutions?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modern construction methods that save time, money, and deliver exceptional quality
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
                  <benefit.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Services */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl mb-4">Our Solutions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive prefabricated building solutions for diverse needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-border hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl">{service.title}</h3>
                </div>
                <p className="text-muted-foreground mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl mb-4">Our Process</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From concept to installation, we guide you through every step
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Consultation', desc: 'Discuss your requirements and vision' },
              { step: '02', title: 'Design', desc: 'Custom design tailored to your needs' },
              { step: '03', title: 'Manufacturing', desc: 'Precision fabrication in our facility' },
              { step: '04', title: 'Installation', desc: 'Quick on-site assembly and handover' }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full mb-4 text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section ref={designsRef} className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl mb-4">Our Designs</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse our collection of smart, stylish and customizable prefab designs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allDesigns.map((project, index) => (
              <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                <div
                  onClick={() => setSelectedImage(project)}
                  className="cursor-pointer"
                >
                  <ImageWithFallback
                    src={project.image}
                    alt={project.title}
                    className="w-full h-56 object-cover hover:opacity-90 transition-opacity"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg mb-1">{project.title}</h3>
                  <p className="text-sm text-muted-foreground">{project.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section ref={quoteRef} id="contact-form" className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl mb-3">Get a Free Quote</h2>
              <p className="text-muted-foreground">
                Tell us about your project and our team will get back to you within 24 hours
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium">Phone *</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter 10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    pattern="[0-9]{10}"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Project Type *</label>
                  <select
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    required
                  >
                    <option value="">Select project type</option>
                    <option value="cottage">Prefabricated Cottage</option>
                    <option value="modular-home">Modular Home</option>
                    <option value="glamping-pod">Glamping Pod</option>
                    <option value="resort">Resort Structure</option>
                    <option value="site-office">Site Office</option>
                    <option value="custom">Custom Structure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Location *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Where will the structure be installed?"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Project Details</label>
                <textarea
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={5}
                  placeholder="Tell us about your requirements, timeline, budget, or any other details..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-lg font-medium"
              >
                Submit Inquiry
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="mb-4 text-center">Or Contact Us Directly</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">+91-9864282966</p>
                    <p className="text-sm text-muted-foreground">+91-9435855559</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                  <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">info@bonoriya.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section — Prefab SEO */}
      <section className="py-16 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl mb-3">Prefab Cottages — Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about prefabricated cottages and modular structures by BONORIYA</p>
          </div>
          <div className="space-y-2.5">
            {([
              ['Who is the best prefab cottage manufacturer in Assam?', 'BONORIYA is a leading prefabricated cottage manufacturer based in Assam, Northeast India. We design and manufacture glamping pods, A-frame cottages, barnhouses, alpine villas and modular resort structures with sustainable materials and rapid installation.'],
              ['What types of prefab structures does BONORIYA manufacture?', "BONORIYA manufactures Glamping Pods (single-room cottages), 1 BHK Barnhouses, A-Frame 1 BHK Cottages, and Alpine Villas. All structures are designed for Northeast India's climate."],
              ['What is the cost of a prefabricated cottage in India?', "Prefab cottage costs depend on the type, size and customization. Contact BONORIYA at +91-9864282966 or use the 'Get a Quote' form for a detailed estimate."],
              ['How long does it take to install a BONORIYA prefab cottage?', 'Most BONORIYA prefab structures can be installed in 2–8 weeks depending on the structure type and site conditions — significantly faster than traditional construction.'],
              ['Do you build prefab cottages for resorts in Northeast India?', 'Yes. BONORIYA specialises in manufacturing prefabricated resort cottages, eco lodges and glamping structures for hospitality businesses across all 8 Northeast Indian states.'],
              ['Are BONORIYA prefab structures weather-resistant for Northeast India?', "All BONORIYA structures are engineered to withstand Northeast India's heavy rainfall, humidity and terrain. Materials are selected for durability, insulation and sustainability."],
              ['Can I get a custom prefab design from BONORIYA?', 'Yes. BONORIYA offers custom prefab solutions tailored to your land, budget and vision — including landscape consultation, architectural planning and complete installation.'],
            ] as [string, string][]).map(([q, a], i) => (
              <details key={i} className="group bg-white border border-border rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-muted/30 transition-colors gap-4">
                  <span className="font-medium text-sm">{q}</span>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-5 pb-4 pt-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Modal - Design Photos Only */}
      {showGallery && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowGallery(false)}
        >
          <button
            onClick={() => setShowGallery(false)}
            className="fixed top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-black" />
          </button>
          <div
            className="relative max-w-7xl w-full py-16"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-4xl text-white text-center mb-8">Design Gallery</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryDesigns.map((design, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl overflow-hidden shadow-lg cursor-pointer hover:shadow-2xl transition-shadow"
                  onClick={() => {
                    setSelectedImage(design);
                    setShowGallery(false);
                  }}
                >
                  <ImageWithFallback
                    src={design.image}
                    alt={design.title}
                    className="w-full h-56 object-cover hover:opacity-90 transition-opacity"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-medium mb-1">{design.title}</h3>
                    <p className="text-sm text-muted-foreground">{design.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal/Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-black" />
          </button>
          <div
            className="relative max-w-6xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageWithFallback
              src={selectedImage.image}
              alt={selectedImage.title}
              className="w-full h-auto object-contain max-h-[90vh]"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <h3 className="text-2xl font-medium mb-1">{selectedImage.title}</h3>
              <p className="text-white/90">{selectedImage.location}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
