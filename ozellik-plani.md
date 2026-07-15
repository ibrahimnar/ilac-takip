# İlaç Takip — Eksik Özellikler ve Uygulama Planı

> Not: `health_app_plan.md` Flutter/Dart'i anlatıyor ancak açık olan proje **React 19 + Vite PWA**.
> Bu plan mevcut React kod tabanını esas alır.

## 1. Mevcut Durum (İnceleme)

| Alan | Durum |
|------|-------|
| Stack | React 19 + Vite, PWA (manifest + SW), localStorage |
| İlaç modeli | `{id, name, dosage, time, taken, date}` — tek saat, grup yok |
| Tansiyon | `{id, systolic, diastolic, pulse, timestamp}` — çalışıyor |
| Bildirim | SW içi `setTimeout` → SW uykuya geçince kaybolur (güvenilmez) |
| Günlük şablon | Yok — ilaçlar tek düz liste |
| Zaman grupları | Yok |
| Onay | Tek seviye (`taken` checkbox) |

**Temel eksiklik:** İlaçlar bir güne ve "sabah/öğle/akşam" gibi zaman gruplarına bağlanmıyor;
bildirim ne zaman, hangi grup için olduğu bilgisiyle tetiklenmiyor; kullanıcı onayı tek boyutlu.

## 2. İstenen Özellikler (Kullanıcı Tanımı)

1. **Günlük "bip" şablonu**: O günün tarihi + o gün sabah/öğle/akşam alınacak ilaçlar.
2. **İlaç listesi**: Önce ilaçlar tanımlanır.
3. **Günlük ilaç alma zaman grupları**: sabah/öğle/akşam (kullanıcı tanımlayabilir).
4. **İlaç–grup ilişkilendirme**: Her ilaç bir/çok zaman grubuna bağlanır.
5. **Bildirim**: Bir grubun zamanı yaklaşınca/geçince uygulama bildirim oluşturur.
6. **İki seviyeli onay**: Kullanıcı hem **ilaç bazında** hem de **bildirim zamanı bazında**
   onaylayarak bildirimi kapatır.

## 3. Yeni Veri Modeli

### 3.1 Zaman Grupları (global config) — `localStorage['time_groups']`
```js
[
  { id: 'morning', label: 'Sabah',  time: '08:00', icon: '🌅' },
  { id: 'noon',    label: 'Öğle',   time: '13:00', icon: '☀️' },
  { id: 'evening', label: 'Akşam',  time: '20:00', icon: '🌙' }
]
```
Kullanıcı grup ekleyebilmeli/düzenleyebilmeli (id, etiket, saat).

### 3.2 İlaç — `localStorage['meds']`
```js
{
  id, name, dosage,
  groupIds: ['morning', 'evening'],   // ilişkilendirme burada
  stock: 30,                           // opsiyonel
  startDate: '2026-07-15', endDate: null
}
```
`time` ve `taken` alanları kaldırılır — bunlar güne/gruba özgüdür.

### 3.3 Günlük Şablon / Günlük Kayıt — `localStorage['daily_log']` (tarihe göre)
```js
{
  '2026-07-15': {
    date: '2026-07-15',
    groups: {
      morning: { meds: [{ medId, taken: false }], notificationAck: false, notifiedAt: null },
      noon:    { meds: [...], notificationAck: false, notifiedAt: null },
      evening: { meds: [...], notificationAck: false, notifiedAt: null }
    }
  }
}
```
Bu nesne **"günlük bip şablonu"**dur: o günün tarihi + her gruptaki ilaçlar + onay durumları.
İlaç/grup değişince veya gün değişince otomatik yeniden üretilir (kayıtlı `taken` korunarak).

## 4. Onay Durum Makinesi (İki Seviye)

Her grup için:
- **İlaç seviyesi**: gruptaki her ilaç ayrı ayrı `taken` işaretlenir.
- **Bildirim zamanı seviyesi**: grup bildirimi için `notificationAck` (kullanıcı "Bildirimi Kapat" der).
- Bildirim **ancak ikisi de tamamlanınca** kapanır (banner kapanır, OS bildirimi kapanır).
- Kullanıcı "Tümü Alındı" hızlı aksiyonuyla ikisini birden yapabilir.
- Kısmi alımda "Ertele" / "Bildirimi Kapat (eksik)" seçeneğiyle geçmişe "kısmen" notu düşülür.

## 5. Bildirim Güvenilirliği (Teknik)

Mevcut `setTimeout` SW içinde ölüyor. Önerilen yaklaşım:
- **Birincil:** `registration.showNotification(tag, { showTrigger: new TimestampTrigger(time) })`
  (Chrome/Android destekliyor; SW yeniden başlasa da tetiklenir).
- **Yedek:** SW içinde periyodik kontrol (her ~60 sn) → vakti gelen ve `notificationAck=false`
  olan gruplar için `showNotification`.
- **Uygulama tarafı:** Her açılışta ve `setInterval` ile "vakti yaklaşan/geçen" grupları değerlendir,
  SW'ye `SCHEDULE_GROUP_NOTIFICATION` mesajı gönder.
- `sw.js` `notificationclick` ve `message` olayları grup bazlı (`tag: grupId+tarih`) güncellenir.

## 6. Uygulama Adımları (Fazlar)

### Faz A — Veri Modeli & Depolama ✅ (tamamlandı)
- [x] `src/utils/storage.js` (get/set yardımcıları) — yeni.
- [x] `src/utils/schedule.js` — `buildDailySchedule(meds, groups, date)` ve `getDueGroups(log, now)`.
- [x] `meds` modelini `groupIds` kullanacak şekilde güncelle + migrasyon.
- [x] `time_groups` CRUD + UI (modal).

### Faz B — Günlük Bip Şablonu (Dashboard) ✅ (tamamlandı)
- [x] `src/components/DailySchedule.jsx` — tarih başlığı + sabah/öğle/akşam kartları.
- [x] Her kart: gruptaki ilaçlar (checkbox = ilaç seviyesi onay) + "Tümü Alındı".
- [x] `src/components/MedicationForm.jsx` — grup çoklu seçimi ile ilaç ekleme (App içinde mevcut).
- [x] `Bugün` sekmesi + nav-bar öğesi eklendi.

### Faz C — Bildirimler ✅ (tamamlandı)
- [x] `src/utils/notifications.js` — grup bazlı `scheduleGroupReminder` (TimestampTrigger) + `showGroupNotification` (anlık).
- [x] `public/sw.js` — `SCHEDULE_GROUP_NOTIFICATION` (TimestampTrigger + setTimeout yedek), `SHOW_GROUP_NOTIFICATION`, grup `tag`, `firedTags`/`scheduledTags` dedupe, `ACK_GROUP` mesajı.
- [x] `src/components/NotificationBanner.jsx` — yaklaşan/geçen grup için in-app uyarı.
- [x] `App.jsx` — izin akışı, 30 sn `tick` ile due grup değerlendirme, SW mesaj dinleyici.

### Faz D — İki Seviyeli Onay & Kapanış ✅ (tamamlandı)
- [x] `notificationAck` (bildirim zamanı) + `taken` (ilaç) state'i; banner "Bildirimi Kapat" düğmesi
      ancak gruptaki tüm ilaçlar `taken` ise etkin — yani ikisi tamam olunca kapanır.
- [x] OS bildirim aksiyonu "Alındı" → SW `ACK_GROUP` → uygulama `notificationAck` ayarlar.
- [ ] Gün değişince yeni şablon üretimi; eski günler arşivlenir (Faz E kapsamında / sonraki iyileştirme).

### Faz E — Doğrulama
- [ ] `npm run dev` → ilaç ekle, gruplara ata, tarih/saat gelince bildirim.
- [ ] İlaç ve bildirim onayı ayrı ayrı; ikisi de olmadan bildirim kapanmıyor.
- [ ] Sayfa yenilenince durum korunuyor (localStorage).

## 7. Etkilenecek Dosyalar
- `src/App.jsx` — yeniden yapılandırma (Dashboard + şablon + banner).
- `src/utils/notifications.js` — grup/trigger tabanlı.
- `src/utils/schedule.js` — **yeni**.
- `src/utils/storage.js` — **yeni**.
- `src/components/DailySchedule.jsx`, `MedicationForm.jsx`, `NotificationBanner.jsx` — **yeni**.
- `public/sw.js` — grup mesajları + periyodik kontrol.
- `src/index.css` — grup kartları, banner stilleri.

## 8. Öncelik Sırası
1. Veri modeli + zaman grupları (Faz A) — temel.
2. Günlük bip şablonu (Faz B) — kullanıcının gördüğü çekirdek değer.
3. Bildirim + iki seviyeli onay (Faz C/D).
4. Doğrulama (Faz E).
