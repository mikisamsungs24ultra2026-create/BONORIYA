import destinationsHero from '../../imports/destinations.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

export default function Destinations() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="w-full bg-black">
        <ImageWithFallback
          src={destinationsHero}
          alt="Destinations in Northeast India"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* Introduction */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl">Discover the Soul of Northeast India with Bonoriya</h1>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
              Embark on unforgettable journeys through the enchanting landscapes, rich cultural heritage, sacred spiritual sites, and pristine wilderness of Northeast India. From the sacred temples of Assam and the misty hills of Meghalaya to the majestic Himalayan valleys of Arunachal Pradesh, Bonoriya brings you closer to the region's most extraordinary destinations.
            </p>
          </div>

          {/* Assam Section */}
          <div className="space-y-6">
            <h2 className="text-3xl border-b border-border pb-3">Assam – Wildlife, Spirituality & River Island Wonders</h2>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Maa Kamakhya Devalaya</h3>
                <p className="text-muted-foreground">
                  One of India's most revered Shakti Peethas, Maa Kamakhya Devalaya attracts pilgrims and spiritual seekers from around the world. Perched atop Nilachal Hill, the temple offers breathtaking views of the Brahmaputra River and a deeply spiritual atmosphere.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Kaziranga National Park</h3>
                <p className="text-muted-foreground">
                  Home to the world's largest population of the endangered one-horned rhinoceros, Kaziranga is a wildlife paradise renowned for its rich biodiversity, elephant safaris, and breathtaking grassland ecosystems.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Majuli</h3>
                <p className="text-muted-foreground">
                  The world's largest inhabited river island, Majuli is celebrated for its vibrant Satras, traditional Assamese culture, scenic river landscapes, and unique island lifestyle.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Nameri National Park</h3>
                <p className="text-muted-foreground">
                  Nestled along the foothills of the Eastern Himalayas, Nameri offers thrilling river rafting, birdwatching opportunities, dense forests, and peaceful riverside retreats.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Manas National Park</h3>
                <p className="text-muted-foreground">
                  A UNESCO World Heritage Site famous for its exceptional biodiversity, lush forests, grasslands, and rare wildlife species including the golden langur and pygmy hog.
                </p>
              </div>
            </div>
          </div>

          {/* Meghalaya Section */}
          <div className="space-y-6">
            <h2 className="text-3xl border-b border-border pb-3">Meghalaya – The Abode of Clouds</h2>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Shillong</h3>
                <p className="text-muted-foreground">
                  Known as the "Scotland of the East," Shillong charms visitors with its pine-covered hills, vibrant culture, waterfalls, lakes, music scene, and pleasant climate.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Cherrapunji</h3>
                <p className="text-muted-foreground">
                  Famous for dramatic waterfalls, mysterious caves, lush landscapes, and some of the highest rainfall on Earth, Cherrapunji is a dream destination for nature lovers.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Living Root Bridges</h3>
                <p className="text-muted-foreground">
                  Ingenious natural wonders created by generations of Khasi communities, these living bridges showcase the perfect harmony between nature and human innovation.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Dawki</h3>
                <p className="text-muted-foreground">
                  Renowned for the crystal-clear waters of the Umngot River, Dawki offers mesmerizing boating experiences amidst breathtaking natural beauty.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Nongstoin</h3>
                <p className="text-muted-foreground">
                  An emerging destination known for rolling green valleys, spectacular waterfalls, serene countryside landscapes, and authentic local experiences.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">East Khasi Hills</h3>
                <p className="text-muted-foreground">
                  A region blessed with dense forests, picturesque valleys, cascading waterfalls, living root bridges, and rich indigenous traditions.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Mawlynnong</h3>
                <p className="text-muted-foreground">
                  Globally recognized as Asia's Cleanest Village, Mawlynnong is a model of sustainable tourism, cleanliness, and community-led environmental stewardship.
                </p>
              </div>
            </div>
          </div>

          {/* Arunachal Pradesh Section */}
          <div className="space-y-6">
            <h2 className="text-3xl border-b border-border pb-3">Arunachal Pradesh – Land of Dawn-Lit Mountains</h2>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Tawang</h3>
                <p className="text-muted-foreground">
                  A mesmerizing Himalayan destination known for its ancient monasteries, snow-capped peaks, high-altitude lakes, and rich Buddhist heritage.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Sela Pass</h3>
                <p className="text-muted-foreground">
                  One of India's most spectacular mountain passes, offering breathtaking panoramic views, pristine alpine lakes, and unforgettable Himalayan scenery.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Anini</h3>
                <p className="text-muted-foreground">
                  A remote paradise surrounded by untouched forests, rugged mountains, crystal-clear rivers, and extraordinary natural beauty.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Ziro</h3>
                <p className="text-muted-foreground">
                  Famous for its lush green valleys, Apatani tribal culture, paddy fields, and tranquil landscapes, Ziro is among India's most picturesque destinations.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Mechuka</h3>
                <p className="text-muted-foreground">
                  A hidden Himalayan gem featuring snow-clad mountains, traditional villages, monasteries, meandering rivers, and breathtaking scenery.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Shergaon</h3>
                <p className="text-muted-foreground">
                  A charming mountain village offering scenic beauty, rich cultural traditions, apple orchards, and peaceful surroundings.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-2xl mb-3">Dirang Valley</h3>
                <p className="text-muted-foreground">
                  Known for its stunning landscapes, monasteries, hot springs, orchards, and spectacular views of the Eastern Himalayas.
                </p>
              </div>
            </div>
          </div>

          {/* Why Travel with Bonoriya */}
          <div className="bg-primary text-primary-foreground rounded-lg p-8 text-center space-y-4">
            <h2 className="text-3xl">Why Travel with Bonoriya?</h2>
            <p className="text-lg max-w-4xl mx-auto">
              Whether you seek spiritual journeys, wildlife adventures, mountain expeditions, cultural immersion, photography tours, or peaceful retreats, Bonoriya curates experiences that showcase the very best of Northeast India.
            </p>
            <p className="text-lg max-w-4xl mx-auto">
              From the sacred Maa Kamakhya Temple to the wilderness of Kaziranga, the crystal-clear waters of Dawki, the living root bridges of Meghalaya, and the majestic Himalayan valleys of Arunachal Pradesh—your extraordinary Northeast adventure begins with Bonoriya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
