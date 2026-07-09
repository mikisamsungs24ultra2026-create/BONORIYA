/**
 * BONORIYA Admin Blog Editor
 * Full-featured blog creation/editing with Supabase persistence and image upload.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Plus, Save, Send, Trash2, Edit3, Eye, Upload, X,
  CheckCircle, AlertCircle, Calendar, Tag, User, Image,
  FileText, Clock, Star, RefreshCw
} from 'lucide-react';
import { supabase } from '../utils/db';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  status: 'draft' | 'published' | 'scheduled';
  is_featured: boolean;
  publish_date: string;
  views: number;
  created_at: string;
  updated_at: string;
}

const EMPTY_BLOG: Omit<Blog, 'id'|'views'|'created_at'|'updated_at'> = {
  title: '', subtitle: '', content: '', excerpt: '',
  category: 'Travel Tips', featured_image_url: '', image_urls: [],
  author_name: 'BONORIYA Team', tags: [], status: 'draft',
  is_featured: false, publish_date: new Date().toISOString().split('T')[0],
};

const CATEGORIES = ['Travel Tips', 'New Properties', 'Destinations', 'Announcements', 'Updates', 'Culture & Heritage', 'Prefab & Construction', 'General'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
      {msg}
      <button onClick={onClose} className="ml-1 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ─── Image uploader helper ────────────────────────────────────────────────────

async function uploadBlogImage(file: File): Promise<string | null> {
  if (file.size > MAX_FILE_BYTES) return null;
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('blog-images').upload(path, file, { upsert: true });
  if (error) { console.error('[BLOG IMG UPLOAD]', error.message); return null; }
  return supabase.storage.from('blog-images').getPublicUrl(path).data.publicUrl;
}

// ─── Main BlogEditor ──────────────────────────────────────────────────────────

export default function BlogEditor() {
  const [blogs, setBlogs]           = useState<Blog[]>([]);
  const [editing, setEditing]       = useState<Partial<Blog> | null>(null);
  const [isNew, setIsNew]           = useState(false);
  const [view, setView]             = useState<'list' | 'editor' | 'preview'>('list');
  const [filterStatus, setFilter]   = useState<'all'|'published'|'draft'|'scheduled'>('all');
  const [toast, setToast]           = useState<{ msg: string; type: 'success'|'error' } | null>(null);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [tagInput, setTagInput]     = useState('');
  const featImgRef  = useRef<HTMLInputElement>(null);
  const galleryRef  = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({ msg, type });

  // ── Load blogs ────────────────────────────────────────────────────────────

  const loadBlogs = async () => {
    const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    if (error) { showToast('Failed to load blogs: ' + error.message, 'error'); return; }
    setBlogs((data || []) as Blog[]);
  };

  useEffect(() => { loadBlogs(); }, []);

  // ── Create / Edit ─────────────────────────────────────────────────────────

  const startNew = () => {
    setEditing({ ...EMPTY_BLOG });
    setIsNew(true); setTagInput('');
    setView('editor');
  };

  const startEdit = (blog: Blog) => {
    setEditing({ ...blog });
    setIsNew(false); setTagInput('');
    setView('editor');
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = async (statusOverride?: 'draft' | 'published' | 'scheduled') => {
    if (!editing) return;
    if (!editing.title?.trim()) { showToast('Blog title is required.', 'error'); return; }

    setSaving(true);
    const status = statusOverride || editing.status || 'draft';
    const payload = {
      ...editing,
      status,
      updated_at: new Date().toISOString(),
    };

    let error: any;
    if (isNew) {
      const res = await supabase.from('blogs').insert([payload]).select().single();
      error = res.error;
      if (!error && res.data) setEditing(res.data as Blog);
    } else {
      const res = await supabase.from('blogs').update(payload).eq('id', editing.id!).select().single();
      error = res.error;
      if (!error && res.data) setEditing(res.data as Blog);
    }

    setSaving(false);
    if (error) { showToast('Save failed: ' + error.message, 'error'); return; }

    await loadBlogs();
    const msg = status === 'published'
      ? 'BLOG PUBLISHED SUCCESSFULLY!'
      : status === 'scheduled'
        ? 'Blog scheduled successfully!'
        : 'Draft saved successfully!';
    showToast(msg);
    if (isNew) setIsNew(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteBlog = async (id: string) => {
    if (!confirm('Delete this blog permanently?')) return;
    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
    showToast('Blog deleted.');
    await loadBlogs();
    if (editing?.id === id) setView('list');
  };

  // ── Featured image upload ─────────────────────────────────────────────────

  const handleFeaturedImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > MAX_FILE_BYTES) { showToast('Image must be under 5 MB.', 'error'); return; }
    setUploading(true);
    const url = await uploadBlogImage(file);
    setUploading(false);
    if (!url) { showToast('Image upload failed.', 'error'); return; }
    setEditing(e => ({ ...e, featured_image_url: url }));
    showToast('Featured image uploaded!');
    if (featImgRef.current) featImgRef.current.value = '';
  };

  // ── Gallery images upload ─────────────────────────────────────────────────

  const handleGalleryImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) { showToast(`"${file.name}" exceeds 5 MB — skipped.`, 'error'); continue; }
      const url = await uploadBlogImage(file);
      if (url) urls.push(url);
    }
    setUploading(false);
    if (urls.length) {
      setEditing(e => ({ ...e, image_urls: [...(e?.image_urls || []), ...urls] }));
      showToast(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded!`);
    }
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const removeGalleryImage = (url: string) => {
    setEditing(e => ({ ...e, image_urls: (e?.image_urls || []).filter(u => u !== url) }));
  };

  // ── Tags ──────────────────────────────────────────────────────────────────

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setEditing(e => ({ ...e, tags: [...(e?.tags || []), t] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => setEditing(e => ({ ...e, tags: (e?.tags || []).filter(t => t !== tag) }));

  // ── Filtered blogs ────────────────────────────────────────────────────────

  const filtered = blogs.filter(b => filterStatus === 'all' || b.status === filterStatus);
  const counts = { all: blogs.length, published: blogs.filter(b=>b.status==='published').length, draft: blogs.filter(b=>b.status==='draft').length, scheduled: blogs.filter(b=>b.status==='scheduled').length };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── BLOG LIST ── */}
      {view === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium">Blog Management</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Create, edit and publish blog posts</p>
            </div>
            <button onClick={startNew} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium">
              <Plus className="h-4 w-4" /> New Blog Post
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg w-fit">
            {(['all','published','draft','scheduled'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-md text-sm capitalize transition-colors ${filterStatus===s?'bg-white shadow-sm font-medium':'hover:bg-muted/60'}`}>
                {s} <span className="text-muted-foreground text-xs ml-1">({counts[s]})</span>
              </button>
            ))}
          </div>

          {/* Blog list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-white">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg mb-2">{filterStatus === 'all' ? 'No blog posts yet' : `No ${filterStatus} posts`}</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first blog post to get started.</p>
              <button onClick={startNew} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">Create Blog Post</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(blog => (
                <div key={blog.id} className="bg-white border border-border rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                  {blog.featured_image_url
                    ? <img src={blog.featured_image_url} alt={blog.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
                    : <div className="w-20 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0"><Image className="h-6 w-6 text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{blog.title}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${blog.status==='published'?'bg-green-100 text-green-700':blog.status==='scheduled'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>
                            {blog.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{blog.category}</span>
                          {blog.is_featured && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1"><Star className="h-3 w-3" />Featured</span>}
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{blog.publish_date}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditing(blog); setIsNew(false); setView('preview'); }} className="p-1.5 hover:bg-muted rounded-lg" title="Preview"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => startEdit(blog)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg" title="Edit"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => deleteBlog(blog.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {blog.excerpt && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{blog.excerpt}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BLOG EDITOR ── */}
      {view === 'editor' && editing && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button onClick={() => setView('list')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to All Posts
            </button>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setView('preview')} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm"><Eye className="h-4 w-4" /> Preview</button>
              <button onClick={() => save('draft')} disabled={saving} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm disabled:opacity-50">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
              </button>
              {(editing.publish_date && editing.publish_date > new Date().toISOString().split('T')[0]) ? (
                <button onClick={() => save('scheduled')} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                  <Clock className="h-4 w-4" /> Schedule
                </button>
              ) : (
                <button onClick={() => save('published')} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
                  <Send className="h-4 w-4" /> Publish Now
                </button>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white border border-border rounded-xl p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Blog Title *</label>
                  <input className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-base focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Enter compelling blog title…" value={editing.title || ''} onChange={e => setEditing(d => ({...d, title: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subtitle <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="A brief supporting subtitle…" value={editing.subtitle || ''} onChange={e => setEditing(d => ({...d, subtitle: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Excerpt / Preview Text</label>
                  <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={2} placeholder="Short summary shown in blog cards (150-200 chars)…" value={editing.excerpt || ''} onChange={e => setEditing(d => ({...d, excerpt: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Blog Content *</label>
                  <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring font-mono" rows={16} placeholder="Write your full blog post here…&#10;&#10;You can use plain text with paragraph breaks.&#10;&#10;Each blank line creates a new paragraph." value={editing.content || ''} onChange={e => setEditing(d => ({...d, content: e.target.value}))} />
                </div>
              </div>

              {/* Gallery images */}
              <div className="bg-white border border-border rounded-xl p-5">
                <h3 className="font-medium mb-3">Inline / Gallery Images</h3>
                {(editing.image_urls || []).length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {(editing.image_urls || []).map(url => (
                      <div key={url} className="relative group">
                        <img src={url} alt="" className="w-24 h-18 object-cover rounded-lg border border-border" />
                        <button onClick={() => removeGalleryImage(url)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/20 hover:border-primary/50 transition-colors">
                  {uploading ? <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">{uploading ? 'Uploading…' : 'Upload blog images'}</p>
                    <p className="text-xs text-muted-foreground">JPG · JPEG · PNG · WEBP · Max 5 MB each</p>
                  </div>
                  <input ref={galleryRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleGalleryImages} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Sidebar settings */}
            <div className="space-y-4">
              {/* Featured image */}
              <div className="bg-white border border-border rounded-xl p-4">
                <h3 className="font-medium mb-3">Featured Image</h3>
                {editing.featured_image_url ? (
                  <div className="relative">
                    <div className="w-full bg-muted rounded-lg border border-border mb-2 flex items-center justify-center overflow-hidden">
                      <img
                        src={editing.featured_image_url}
                        alt="Featured"
                        className="w-full h-auto max-h-48 object-contain rounded-lg"
                        style={{ display: 'block' }}
                      />
                    </div>
                    <button onClick={() => setEditing(d => ({...d, featured_image_url: ''}))} className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                      <X className="h-3 w-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/20 hover:border-primary/50 transition-colors">
                    {uploading ? <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" /> : <Image className="h-7 w-7 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground text-center">{uploading ? 'Uploading…' : 'Click to upload featured image'}</span>
                    <input ref={featImgRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleFeaturedImage} disabled={uploading} />
                  </label>
                )}
              </div>

              {/* Post settings */}
              <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-medium">Post Settings</h3>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Category</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={editing.category || 'Travel Tips'} onChange={e => setEditing(d => ({...d, category: e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Author Name</label>
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={editing.author_name || ''} onChange={e => setEditing(d => ({...d, author_name: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Publish Date</label>
                  <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="date" className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={editing.publish_date || ''} onChange={e => setEditing(d => ({...d, publish_date: e.target.value}))} />
                  </div>
                  {editing.publish_date && editing.publish_date > new Date().toISOString().split('T')[0] && (
                    <p className="text-xs text-blue-600 mt-1">⏰ Will be scheduled for future publish</p>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={editing.is_featured || false} onChange={e => setEditing(d => ({...d, is_featured: e.target.checked}))} />
                  <span className="text-sm flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" /> Mark as Featured Post</span>
                </label>
              </div>

              {/* Tags */}
              <div className="bg-white border border-border rounded-xl p-4">
                <h3 className="font-medium mb-2">Tags / Keywords</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(editing.tags || []).map(t => (
                    <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs">
                      {t}<button onClick={() => removeTag(t)} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1"><Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg bg-input-background text-sm" placeholder="Add tag…" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
                  </div>
                  <button onClick={addTag} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"><Plus className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => save('draft')} disabled={saving} className="flex items-center justify-center gap-1.5 py-2.5 border border-border rounded-lg hover:bg-muted text-sm font-medium disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save Draft
                </button>
                <button onClick={() => save('published')} disabled={saving} className="flex items-center justify-center gap-1.5 py-2.5 bg-forest-900 text-white rounded-lg hover:bg-forest-900/80 text-sm font-medium disabled:opacity-50">
                  <Send className="h-4 w-4" /> Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BLOG PREVIEW ── */}
      {view === 'preview' && editing && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setView(isNew ? 'editor' : 'list')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              ← {isNew ? 'Back to Editor' : 'Back to All Posts'}
            </button>
            <button onClick={() => setView('editor')} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
              <Edit3 className="h-4 w-4" /> Edit Post
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {editing.featured_image_url && (
              <div className="w-full bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={editing.featured_image_url}
                  alt={editing.title}
                  className="w-full h-auto max-h-[500px] object-contain"
                  style={{ display: 'block' }}
                />
              </div>
            )}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {editing.category && <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">{editing.category}</span>}
                {editing.is_featured && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full flex items-center gap-1"><Star className="h-3 w-3 fill-current" />Featured</span>}
                <span className={`px-3 py-1 text-sm rounded-full ${editing.status==='published'?'bg-green-100 text-green-700':editing.status==='scheduled'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>
                  {editing.status}
                </span>
              </div>
              <h1 className="text-3xl font-semibold mb-2">{editing.title || 'Untitled Post'}</h1>
              {editing.subtitle && <h2 className="text-xl text-muted-foreground mb-4">{editing.subtitle}</h2>}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
                <span className="flex items-center gap-1"><User className="h-4 w-4" />{editing.author_name}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{editing.publish_date}</span>
              </div>
              {editing.excerpt && <p className="text-muted-foreground text-lg mb-6 italic border-l-4 border-primary pl-4">{editing.excerpt}</p>}
              <div className="prose max-w-none text-base leading-relaxed whitespace-pre-wrap text-foreground">{editing.content}</div>
              {(editing.image_urls || []).length > 0 && (
                <div className="mt-8">
                  <h3 className="font-medium mb-3">Photo Gallery</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(editing.image_urls || []).map(url => <img key={url} src={url} alt="" className="w-full h-40 object-cover rounded-lg" />)}
                  </div>
                </div>
              )}
              {(editing.tags || []).length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    {(editing.tags || []).map(t => <span key={t} className="px-3 py-1 bg-muted rounded-full text-xs flex items-center gap-1"><Tag className="h-3 w-3" />{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
