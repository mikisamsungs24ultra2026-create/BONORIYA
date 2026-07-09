import { Phone, Mail, MapPin } from 'lucide-react';
import contactHero from '../../imports/contact-us.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="w-full bg-black">
        <ImageWithFallback
          src={contactHero}
          alt="Contact Bonoriya"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Contact Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-4xl mb-4">Contact Us</h2>
              <p className="text-muted-foreground mb-8">
                Ready to explore North East India or build your dream cottage? Contact us today!
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p>+91-9864282966</p>
                    <p>+91-9435855559</p>
                    <p className="text-sm text-muted-foreground">Available 9 AM - 6 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p>info@bonoriya.com</p>
                    <p className="text-sm text-muted-foreground">General inquiries</p>
                    <p className="mt-2">grievance@bonoriya.com</p>
                    <p className="text-sm text-muted-foreground">For grievances</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p>Kamakhya Mandir Rd, Bhutnath,</p>
                    <p>Guwahati-10, Assam</p>
                    <p className="text-sm text-muted-foreground">Registered Office</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card p-8 rounded-xl shadow-lg">
              <form className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm">Interest</label>
                  <select className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                    <option>Tourism & Stays</option>
                    <option>Prefab Structures</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Message</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Tell us about your requirements..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
