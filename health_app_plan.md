# Proje Planı: İlaç ve Tansiyon Takip Uygulaması

> Not: Bu uygulama **React 19 + Vite PWA** ile geliştirilmektedir (Flutter/Dart seçeneğinden vazgeçildi).
> Ayrıntılı özellik/uygulama planı için bkz. `ozellik-plani.md`.

## 1. Genel Bakış ve Hedefler
**Amaç:** Kullanıcının ilaç kullanımını düzenli hale getiren hatırlatmalar sunmak ve günlük tansiyon ölçümlerini kaydederek sağlık takibini kolaylaştırmak.
**Hedef Kitle:** Düzenli ilaç kullanan ve tansiyon takibi yapması gereken bireyler.
**Platform:** Mobil öncelikli PWA (React + Vite, Service Worker, localStorage).

## 2. Teknoloji Yığını
*   **Framework:** React 19 + Vite
*   **Depolama:** `localStorage` (anahtar önekli yardımcılar)
*   **Bildirimler:** Web Notifications API + Service Worker (`showNotification`, `TimestampTrigger`)
*   **PWA:** `manifest.json` + `public/sw.js` (offline cache)

## 3. Veri Modelleri
*   **Zaman Grupları (time_groups):** `{ id, label, time, icon }` — sabah/öğle/akşam (kullanıcı tanımlı).
*   **İlaç (meds):** `{ id, name, dosage, groupIds[], stock?, startDate?, endDate? }` — gruplara bağlanır.
*   **Günlük Şablon (daily_log):** tarihe göre `{ date, groups: { groupId: { meds:[{medId,taken}], notificationAck, notifiedAt } } }`.
*   **Tansiyon (bp_records):** `{ id, systolic, diastolic, pulse, timestamp }` — çalışıyor.

## 4. Geliştirme Aşamaları
Uygulama fazları `ozellik-plani.md` içinde tanımlıdır:
*   **Faz A:** Veri modeli & depolama (storage.js, schedule.js, groupIds migrasyonu, zaman grubu CRUD)
*   **Faz B:** Günlük bip şablonu (Dashboard)
*   **Faz C:** Bildirimler (grup bazlı, TimestampTrigger)
*   **Faz D:** İki seviyeli onay (ilaç + bildirim zamanı)
*   **Faz E:** Doğrulama

## 5. Doğrulama (Verification)
*   Uygulama açılıyor mu?
*   İlaç eklenince gruplara doğru şekilde atanıyor mu?
*   Günlük şablon o günün tarihi + sabah/öğle/akşam ilaçlarını gösteriyor mu?
*   Grubun saati gelince bildirim oluşuyor mu? (Faz C)
*   İlaç ve bildirim onayı ayrı ayrı; ikisi de olmadan bildirim kapanmıyor mu? (Faz D)
*   Sayfa yenilenince veriler korunuyor mu?
