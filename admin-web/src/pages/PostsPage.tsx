/** Chuyện Nini / chính sách / hỏi đáp: thêm, sửa, đăng hoặc gỡ bài, upload ảnh bìa */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { PostSummaryDTO } from '@shared/types';
import { del, errMessage, get, post, put, uploadFile } from '../lib/api';
import { imageUrl } from '../lib/placeholder';
import { formatDate } from '../lib/format';
import { Loading, PageTitle, Empty, Modal } from '../components/ui';
import { FlexTag } from '../components/bits';
import { useToast } from '../hooks/toast';

type PostType = 'STORY' | 'POLICY' | 'FAQ';
const TYPES: Array<{ v: PostType | ''; label: string }> = [
  { v: '', label: 'Tất cả' },
  { v: 'STORY', label: 'Chuyện Nini' },
  { v: 'POLICY', label: 'Chính sách' },
  { v: 'FAQ', label: 'Hỏi & đáp' },
];
const TYPE_LABEL: Record<PostType, string> = { STORY: 'Chuyện Nini', POLICY: 'Chính sách', FAQ: 'Hỏi & đáp' };

interface PostForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  type: PostType;
  isPublished: boolean;
}
const blank: PostForm = { title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', type: 'STORY', isPublished: false };

export default function PostsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<PostType | ''>('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PostSummaryDTO | null>(null);
  const [form, setForm] = useState<PostForm>(blank);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ['admin-posts', { type }],
    queryFn: () => {
      const params: Record<string, unknown> = {};
      if (type) params.type = type;
      return get<PostSummaryDTO[]>('/admin/posts', params);
    },
  });

  const saveM = useMutation({
    mutationFn: () => {
      const content = form.content.trim();
      const body: Partial<{
        title: string; slug: string; excerpt: string; content: string;
        coverImageUrl: string; type: PostType; isPublished: boolean;
      }> = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim(),
        coverImageUrl: form.coverImageUrl.trim(),
        type: form.type,
        isPublished: form.isPublished,
      };
      /* Khi sửa mà không gõ lại nội dung thì giữ nguyên nội dung cũ (bổ sung riêng phần content) */
      if (!editing || content.length >= 10) body.content = form.content.trim();
      return editing ? put(`/admin/posts/${editing.id}`, body) : post('/admin/posts', body);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu bài viết.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
      setOpen(false);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const publishM = useMutation({
    mutationFn: (p: PostSummaryDTO) => put(`/admin/posts/${p.id}`, { isPublished: !p.isPublished }),
    onSuccess: () => {
      toast('Đã cập nhật trạng thái đăng.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const rmM = useMutation({
    mutationFn: (id: number) => del(`/admin/posts/${id}`),
    onSuccess: (r) => {
      toast(r.message || 'Đã xóa bài viết.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await uploadFile(file);
      setForm((f) => ({ ...f, coverImageUrl: r.url }));
      toast('Đã tải ảnh lên.', 'ok');
    } catch (e) {
      toast(errMessage(e, 'Không tải được ảnh.'), 'err');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const posts = q.data || [];

  return (
    <>
      <PageTitle title="Bài viết"
        action={<button className="btn btn-gold btn-sm" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>+ Viết bài mới</button>} />

      <div className="tabs" style={{ marginBottom: 14 }}>
        {TYPES.map((t) => (
          <button key={t.v} className={`tab ${type === t.v ? 'active' : ''}`}
            onClick={() => { setType(t.v); if (editing) setEditing(null); }}>{t.label}</button>
        ))}
      </div>

      {q.isLoading ? <Loading text="Đang lấy bài viết..." /> : posts.length === 0 ? (
        <Empty title="Chưa có bài viết nào" children={<p className="small muted">Viết chuyện thương hiệu, chính sách hoặc mục hỏi đáp cho khách.</p>} />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Bài viết</th><th>Loại</th><th>Trạng thái</th><th>Ngày đăng</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.title}</b>
                    <div className="small muted">/{p.slug}</div>
                    <div className="small muted">{p.excerpt || '—'}</div>
                  </td>
                  <td>{TYPE_LABEL[p.type]}</td>
                  <td>{p.isPublished
                    ? <FlexTag color="#1e8e5a">Đã đăng</FlexTag>
                    : <FlexTag color="#b0803c">Nháp</FlexTag>}
                  </td>
                  <td className="small">{formatDate(p.publishedAt) !== '—' ? formatDate(p.publishedAt) : formatDate(p.createdAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      setEditing(p);
                      setForm({ title: p.title, slug: p.slug, excerpt: p.excerpt || '', content: '', coverImageUrl: p.coverImageUrl || '', type: p.type, isPublished: p.isPublished });
                      setOpen(true);
                    }}>Sửa</button>
                    <button className="btn btn-outline btn-sm" style={{ marginLeft: 6 }} disabled={publishM.isPending} onClick={() => publishM.mutate(p)}>
                      {p.isPublished ? 'Gỡ' : 'Đăng'}
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }}
                      onClick={() => { if (window.confirm(`Xóa bài "${p.title}"?`)) rmM.mutate(p.id); }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={editing ? `Sửa bài: ${editing.title}` : 'Viết bài mới'} onClose={() => setOpen(false)} width={820}>
        <form onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
          <div className="field">
            <label>Tiêu đề (2–160 ký tự)</label>
            <input className="input" required minLength={2} maxLength={160} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label>Đường dẫn (slug) — để trống để tự sinh từ tiêu đề</label>
            <input className="input" maxLength={160} placeholder="vidu-chuyen-nini" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^0-9a-z-]/g, '-') })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Loại bài</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PostType })}>
                <option value="STORY">Chuyện Nini</option>
                <option value="POLICY">Chính sách</option>
                <option value="FAQ">Hỏi & đáp</option>
              </select>
            </div>
            <div className="field">
              <label>Ảnh bìa</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <img src={imageUrl(form.coverImageUrl, form.title || 'Ảnh bìa')} alt="Xem trước"
                  style={{ width: 96, height: 56, objectFit: 'cover', borderRadius: 6, background: 'var(--cream-2)' }} />
                <input ref={fileRef} type="file" accept="image/*" disabled={uploading} onChange={(e) => pickFile(e.target.files?.[0])} />
              </div>
              <input className="input" style={{ marginTop: 6 }} placeholder="Hoặc dán đường dẫn ảnh" value={form.coverImageUrl}
                onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Tóm tắt hiện bên ngoài (tối đa 300 ký tự)</label>
            <textarea className="textarea" rows={2} maxLength={300} value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <div className="field">
            <label>Nội dung {editing ? '(bỏ trống nếu muốn giữ nguyên nội dung cũ)' : '(tối thiểu 10 ký tự)'}</label>
            <textarea className="textarea" rows={9} required={!editing} minLength={editing ? 0 : 10} maxLength={20000} value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <label className="check-row mb-16">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Đăng bài cho khách xem
          </label>
          <div className="small muted" style={{ marginBottom: 10 }}>
            Khi tạo mới, slug không bắt buộc: sẽ tự sinh từ tiêu đề. Khi đã đăng, khách xem bài tại /bai-viet/{'{slug}'}.
          </div>
          <button className="btn btn-primary" disabled={saveM.isPending || uploading}>{saveM.isPending ? 'Đang lưu...' : 'Lưu bài viết'}</button>
        </form>
      </Modal>
    </>
  );
}
