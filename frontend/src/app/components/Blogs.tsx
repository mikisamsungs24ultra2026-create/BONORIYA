import { useState, useEffect } from 'react';
import { Calendar, User, Tag, ArrowRight, ArrowLeft, Search, BookOpen } from 'lucide-react';
import blogHero from '../../imports/blog-bonoriya.png';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { supabase } from '../utils/db';

interface BlogsProps {
  setCurrentPage: (page: string, section?: string) => void;
}

interface Blog {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  excerpt: string;
  category: string;
  featured_image_url: string;
  image_urls: string[];
  author_name: string;
  tags: string[];
  status: string;
  is_featured: boolean;
  publish_date: string;
  views: number;
  created_at: string;
}

const CATEGORIES_FILTER = ['All', 'Travel Tips', 'New Properties', 'Destinations', 'Announcements', 'Updates', 'Culture & Heritage', 'Prefab & Construction'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Blogs({ setCurrentPage }: BlogsProps) {
  const [blogs, setBlogs]         = useState<Blog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedBlog, setSelected] = useState<Blog | null>(null);
  const [category, setCategory]   = useState('All');
  const [search, setSearch]       = useState('');

  // Fetch published blogs (and scheduled ones whose date has arrived)
  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .or(`status.eq.published,and(status.eq.scheduled,publish_date.lte.${today})`)
        .order('publish_date', { ascending: false });
      if (!error) setBlogs((data || []) as Blog[]);
      setLoading(false);
    };
    fetchBlogs();

    // Real-time subscription — updates the page instantly when admin publishes
    const channel = supabase
      .channel('public_blogs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blogs' }, fetchBlogs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Increment view count when a blog is opened
  const openBlog = async (blog: Blog) => {
    setSelected(blog);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await supabase.from('blogs').update({ views: (blog.views || 0) + 1 }).eq('id', blog.id);
  };

  const featuredPost = blogs.find(b => b.is_featured);
  const filtered = blogs.filter(b => {
    const matchCat = category === 'All' || b.category === category;
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.excerpt || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && !b.is_featured;
  });

  // ── Single Blog View ──────────────────────────────────────────────────────

  if (selectedBlog) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero image */}
        {selectedBlog.featured_image_url && (
          <div className="w-full bg-black flex items-center justify-center">
            <img
              src={selectedBlog.featured_image_url}
              alt={selectedBlog.title}
              className="w-full h-auto max-h-[500px] object-contain"
              style={{ display: 'block' }}
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <button onClick={() => { setSelected(null); window.scrollTo({top:0}); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Blogs
          </button>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">{selectedBlog.category}</span>
            {selectedBlog.is_featured && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">⭐ Featured</span>}
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold mb-3 leading-tight">{selectedBlog.title}</h1>
          {selectedBlog.subtitle && <h2 className="text-xl text-muted-foreground mb-5">{selectedBlog.subtitle}</h2>}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border flex-wrap">
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{selectedBlog.author_name}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(selectedBlog.publish_date)}</span>
            {selectedBlog.views > 0 && <span className="text-xs">{selectedBlog.views} views</span>}
          </div>

          {selectedBlog.excerpt && (
            <p className="text-lg text-muted-foreground italic border-l-4 border-primary pl-5 mb-8 leading-relaxed">{selectedBlog.excerpt}</p>
          )}

          <div className="prose prose-lg max-w-none leading-relaxed whitespace-pre-wrap text-base text-foreground">
            {selectedBlog.content}
          </div>

          {(selectedBlog.image_urls || []).length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-medium mb-4">Photo Gallery</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedBlog.image_urls || []).map((url, i) => (
                  <img key={i} src={url} alt={`${selectedBlog.title} — photo ${i+1}`} className="w-full h-52 object-cover rounded-xl shadow-sm hover:shadow-md transition-shadow" />
                ))}
              </div>
            </div>
          )}

          {(selectedBlog.tags || []).length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {(selectedBlog.tags || []).map(t => (
                  <span key={t} className="px-3 py-1 bg-muted rounded-full text-sm flex items-center gap-1">
                    <Tag className="h-3 w-3" />{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-border">
            <button onClick={() => { setSelected(null); window.scrollTo({top:0}); }}
              className="flex items-center gap-2 text-primary hover:underline text-sm">
              <ArrowLeft className="h-4 w-4" /> Back to all blogs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Blog Listing ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="w-full bg-black">
        <ImageWithFallback src={blogHero} alt="BONORIYA Blogs" className="w-full h-auto object-contain" />
      </div>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header + search */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-medium">BONORIYA Stories</h1>
              <p className="text-muted-foreground mt-1">Travel guides, property news and Northeast India insights</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search blogs…" className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Loading blogs…</p>
              </div>
            </div>
          ) : blogs.length === 0 ? (
            /* Empty state — no published blogs yet */
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-medium mb-2">No blogs yet</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">Our travel stories and property updates are coming soon. Check back shortly.</p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featuredPost && (
                <div className="mb-14">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium">⭐ Featured</span>
                  </div>
                  <div onClick={() => openBlog(featuredPost)} className="grid md:grid-cols-2 gap-0 bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow">
                    <div className="h-72 md:h-full">
                      {featuredPost.featured_image_url
                        ? <img src={featuredPost.featured_image_url} alt={featuredPost.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><BookOpen className="h-16 w-16 text-primary/30" /></div>
                      }
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-muted rounded-full text-xs">{featuredPost.category}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(featuredPost.publish_date)}</span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-medium mb-3 leading-snug">{featuredPost.title}</h2>
                      {featuredPost.subtitle && <p className="text-muted-foreground text-lg mb-3">{featuredPost.subtitle}</p>}
                      <p className="text-muted-foreground mb-5 line-clamp-3 text-sm leading-relaxed">{featuredPost.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{featuredPost.author_name}</span>
                        <span className="flex items-center gap-1 text-primary text-sm font-medium">Read More <ArrowRight className="h-4 w-4" /></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category filter */}
              <div className="mb-8 overflow-x-auto">
                <div className="flex gap-2 pb-1">
                  {CATEGORIES_FILTER.filter(c => c === 'All' || blogs.some(b => b.category === c)).map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-xl border text-sm whitespace-nowrap transition-colors flex-shrink-0 ${category===cat?'bg-primary text-primary-foreground border-primary':'bg-white border-border hover:bg-muted'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No posts found for "{category}"{search && ` matching "${search}"`}.</p>
                  <button onClick={() => { setCategory('All'); setSearch(''); }} className="mt-3 text-primary hover:underline text-sm">Clear filters</button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map(post => (
                    <div key={post.id} onClick={() => openBlog(post)} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer group overflow-hidden">
                      <div className="h-52 overflow-hidden bg-muted">
                        {post.featured_image_url
                          ? <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"><BookOpen className="h-10 w-10 text-primary/30" /></div>
                        }
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-2.5 py-0.5 bg-muted rounded-full text-xs">{post.category}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.publish_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <h3 className="text-lg font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                        {post.excerpt && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>}
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{post.author_name}</span>
                          <span className="text-primary text-sm flex items-center gap-1 font-medium">Read More <ArrowRight className="h-3.5 w-3.5" /></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h2 className="text-2xl font-medium mb-2">Stay Updated</h2>
          <p className="text-muted-foreground text-sm mb-6">Subscribe for new property announcements, travel tips and Northeast India stories.</p>
          <form className="flex gap-3" onSubmit={e => e.preventDefault()}>
            <input type="email" placeholder="your@email.com" className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
            <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 text-sm font-medium whitespace-nowrap">Subscribe</button>
          </form>
        </div>
      </section>
    </div>
  );
}
