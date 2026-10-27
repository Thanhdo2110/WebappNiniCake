/** Liên hệ: thông tin + form gửi tin nhắn */
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { post, errMessage } from '../lib/api';
import { useSettings } from '../hooks/catalog';
import { useToast } from '../hooks/toast';
import { useSeo } from '../lib/seo';
import { PageIntro, Reveal } from '../components/ui';

export default function ContactPage() {
  const { data: s } = useSettings();
  const { toast } = useToast();
  useSeo({ title: 'Liên hệ', description: 'Đường đến tiệm, hotline và gửi yêu cầu bánh theo đặt riêng.' });

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', content: '' });

  const sendM = useMutation({
    mutationFn: () => post('/contact', {
      name: form.name, email: form.email,
      phone: form.phone || undefined, subject: form.subject || undefined, content: form.content,
    }),
    onSuccess: (r) => {
      toast(r.message || 'Đã gửi tin nhắn!', 'ok');
      setForm({ name: '', email: '', phone: '', subject: '', content: '' });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

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
            <form onSubmit={(e) => { e.preventDefault(); sendM.mutate(); }}>
              <div className="field-grid">
                <div className="field"><label>Tên của bạn</label>
                  <input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="field"><label>Email</label>
                  <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="field"><label>Điện thoại (không bắt buộc)</label>
                  <input className="input" value={form.phone} maxLength={15} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="field"><label>Chủ đề</label>
                  <input className="input" value={form.subject} maxLength={120} placeholder="VD: Đặt 15 bánh cưới cho hội nghị" onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              </div>
              <div className="field"><label>Nội dung (từ 10 ký tự)</label>
                <textarea className="textarea" required minLength={10} maxLength={2000} rows={5} value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Bạn mong muốn gì, ngày nào, bao nhiêu phần bánh? Xác nhận nếu cần ngay." /></div>
              <button className="btn btn-primary btn-lg" disabled={sendM.isPending}>
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
            <div className="zone-box">
              <b className="small">Khu vực giao</b>
              <p className="small muted">
                Quận 1, 3, 4, 5, 7, 10, 11, Tân Bình, Phú Nhuận, Bình Thạnh (90 phút xung quanh khung giờ nhận).
                Ngoài khu này, vui lòng nhận bánh tại tiệm.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
