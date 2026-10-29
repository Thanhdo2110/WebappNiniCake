/** Liên hệ: thông tin + bản đồ + form gửi tin nhắn kiểm tra tại chỗ */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Facebook, ImagePlus, Instagram, Mail, MapPin, MessageCircle, Navigation, Phone, Send, Trash2 } from 'lucide-react';
import { post, errMessage, uploadGuestImage } from '../lib/api';
import { useSettings } from '../hooks/catalog';
import { useToast } from '../hooks/toast';
import { useSeo } from '../lib/seo';
import { PageIntro, Reveal } from '../components/ui';
import { embedAddressLink, searchLink } from '../lib/geo';
import { contactSchema } from '../lib/validation';
import type { ContactForm } from '../lib/validation';

const MAX_ATTACH_MB = 5; // server chặn theo MAX_UPLOAD_MB; kiểm ở đây để báo lỗi dễ hiểu

export default function ContactPage() {
  const { data: s } = useSettings();
  const { toast } = useToast();
  const [attach, setAttach] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useSeo({ title: 'Liên hệ', description: 'Đường đến tiệm, hotline và gửi yêu cầu bánh theo đặt riêng.' });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', content: '' },
    mode: 'onBlur',
  });

  const sendM = useMutation({
    mutationFn: (v: ContactForm & { imageUrl?: string }) => post('/contact', {
      name: v.name, email: v.email,
      phone: v.phone || undefined, subject: v.subject || undefined, content: v.content,
      imageUrl: v.imageUrl,
    }),
    onSuccess: (r) => {
      toast(r.message || 'Đã gửi tin nhắn!', 'ok');
      reset();
      setAttach(null);
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const pickAttach = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Ảnh đính kèm phải là tệp ảnh.', 'err'); return; }
    if (file.size > MAX_ATTACH_MB * 1024 * 1024) { toast(`Ảnh cần nhỏ hơn ${MAX_ATTACH_MB}MB.`, 'err'); return; }
    setUploading(true);
    try {
      const { url } = await uploadGuestImage(file);
      setAttach(url);
      toast('Đã đính kèm ảnh bánh.', 'ok');
    } catch (e) {
      toast(errMessage(e), 'err');
    } finally {
      setUploading(false);
    }
  };

  const errOf = (k: keyof ContactForm) => errors[k]?.message;

  return (
    <>
      <PageIntro
        eyebrow="Liên hệ"
        title="Gặp Nini"
        subtitle="Bạn cần giúp chọn bánh cho sự kiện, đặt bánh số lượng lớn, hay muốn đổi màu kem? Hãy nhắn nhé."
        crumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Liên hệ' }]}
      />

      <div className="container section section--tight">
        <div className="contact-grid">
          <Reveal from="left" as="div" className="card pad">
            <span className="eyebrow">Gửi yêu cầu</span>
            <h3 className="panel-title">Tiệm đọc và trả lời trong ngày</h3>
            <form onSubmit={handleSubmit((v) => sendM.mutate({ ...v, imageUrl: attach || undefined }))} noValidate>
              <div className="field-grid">
                <div className="field"><label htmlFor="ct-name">Tên của bạn</label>
                  <input id="ct-name" className={`input${errOf('name') ? ' is-invalid' : ''}`} maxLength={80}
                    autoComplete="name" aria-invalid={!!errOf('name')} {...register('name')} />
                  {errOf('name') && <span className="form-error">{errOf('name')}</span>}</div>
                <div className="field"><label htmlFor="ct-email">Email</label>
                  <input id="ct-email" className={`input${errOf('email') ? ' is-invalid' : ''}`} type="email"
                    autoComplete="email" aria-invalid={!!errOf('email')} {...register('email')} />
                  {errOf('email') && <span className="form-error">{errOf('email')}</span>}</div>
                <div className="field"><label htmlFor="ct-phone">Điện thoại (không bắt buộc)</label>
                  <input id="ct-phone" className={`input${errOf('phone') ? ' is-invalid' : ''}`} maxLength={15}
                    inputMode="tel" autoComplete="tel" aria-invalid={!!errOf('phone')} {...register('phone')} />
                  {errOf('phone') && <span className="form-error">{errOf('phone')}</span>}</div>
                <div className="field"><label htmlFor="ct-subject">Chủ đề</label>
                  <input id="ct-subject" className="input" maxLength={120} placeholder="VD: Đặt 15 bánh cưới cho hội nghị" {...register('subject')} /></div>
              </div>
              <div className="field"><label htmlFor="ct-content">Nội dung (từ 10 ký tự)</label>
                <textarea id="ct-content" className={`textarea${errOf('content') ? ' is-invalid' : ''}`} rows={5} maxLength={2000}
                  aria-invalid={!!errOf('content')} {...register('content')}
                  placeholder="Bạn mong muốn gì, ngày nào, bao nhiêu phần bánh? Xác nhận nếu cần ngay." />
                {errOf('content') && <span className="form-error">{errOf('content')}</span>}</div>
              <div className="field">
                <label htmlFor="ct-attach">Ảnh bánh bạn muốn đặt (không bắt buộc)</label>
                {attach ? (
                  <div className="ref-row">
                    <img src={attach} alt="Ảnh bánh bạn vừa đính kèm" className="ref-row__img" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttach(null)}>
                      <Trash2 size={14} /> Bỏ ảnh
                    </button>
                  </div>
                ) : (
                  <label className="file-drop">
                    <input id="ct-attach" type="file" accept="image/*" disabled={uploading}
                      onChange={(e) => { void pickAttach(e.target.files?.[0]); e.target.value = ''; }} />
                    <span className="file-drop__label">
                      <ImagePlus size={15} /> {uploading ? 'Đang tải ảnh lên…' : 'Chọn ảnh từ máy'}
                    </span>
                  </label>
                )}
                <p className="small faint" style={{ margin: '6px 0 0' }}>
                  Tiệm sẽ xem ảnh này khi tư vấn mẫu. Tối đa {MAX_ATTACH_MB}MB, dạng JPEG/PNG/WebP.
                </p>
              </div>
              <button className="btn btn-primary btn-lg" disabled={sendM.isPending || uploading}>
                <Send size={15} /> {sendM.isPending ? 'Đang gửi...' : 'Gửi cho Nini'}
              </button>
            </form>
          </Reveal>

          <Reveal from="right" as="div" className="card pad info-card">
            <span className="eyebrow">Nhà chung của tiệm</span>
            <h3 className="panel-title">Ghé hoặc gọi</h3>
            <ul className="info-list">
              <li><MapPin size={15} /> <span>{s?.address}</span></li>
              <li><Clock size={15} /> <span>{s?.openingHours}</span></li>
              <li><Phone size={15} /> <a href={`tel:${s?.phone}`} className="link-gold">{s?.phone}</a></li>
              <li><Mail size={15} /> <a href={`mailto:${s?.email}`} className="link-gold">{s?.email}</a></li>
              {s?.facebook && (
                <li><Facebook size={15} /> <a href={s.facebook} target="_blank" rel="noreferrer" className="link-gold">Facebook</a></li>
              )}
              {s?.instagram && (
                <li><Instagram size={15} /> <a href={s.instagram} target="_blank" rel="noreferrer" className="link-gold">Instagram</a></li>
              )}
              {s?.zalo && <li><MessageCircle size={15} /> <span>Zalo: <b>{s.zalo}</b></span></li>}
            </ul>

            {s?.address && (
              <div className="contact-map">
                <iframe
                  title="Bản đồ đến tiệm Nini Cakes"
                  src={embedAddressLink(s.address)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a className="pin-chip" href={searchLink(s.address)} target="_blank" rel="noreferrer">
                  <Navigation size={12} /> Chỉ đường đến tiệm
                </a>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </>
  );
}
