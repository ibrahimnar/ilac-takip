# Proje Planı: Mobil İlaç ve Tansiyon Takip Uygulaması

## 1. Genel Bakış ve Hedefler
**Amaç:** Kullanıcının ilaç kullanımını düzenli hale getirmesini sağlayan hatırlatmalar sunmak ve günlük tansiyon ölçümlerini kaydederek sağlık takibini kolaylaştırmak.
**Hedef Kitle:** Düzenli ilaç kullanan ve tansiyon takibi yapması gereken bireyler.
**Platform:** Mobil (Android & iOS) - Flutter ile geliştirilecek.

## 2. Teknik Mimari
### 2.1 Teknoloji Yığını
*   **Framework:** Flutter (Dart)
*   **Devlet Yönetimi (State Management):** Riverpod veya Provider (Basit ve etkili olduğu için Riverpod önerilir).
*   **Yerel Veritabanı:** Hive (NoSQL, çok hızlı ve hafif) veya SQLite (sqflite). *Hive seçildi.*
*   **Bildirimler & Arka Plan:** `flutter_local_notifications` (Bildirimler), `android_alarm_manager_plus` (Kesin zamanlı alarmlar için).
*   **Tarih/Saat İşlemleri:** `intl` paketi.

### 2.2 Veri Modelleri
#### A. İlaç (Medication)
*   `id`: Benzersiz kimlik (UUID).
*   `name`: İlaç adı (String).
*   `dosage`: Dozaj bilgisi (mg, adet vb. - String).
*   `frequency`: Kullanım sıklığı (Günde X kez, Haftada Y gün vb. - Enum/Int).
*   `times`: Günlük alınacak saatler (List<TimeOfDay>).
*   `startDate`: Başlangıç tarihi.
*   `endDate`: Bitiş tarihi (Opsiyonel).
*   `stock`: Kalan ilaç adedi (Opsiyonel - Stok takibi için).

#### B. Tansiyon Kaydı (BloodPressureRecord)
*   `id`: Benzersiz kimlik.
*   `systolic`: Büyük Tansiyon (mm Hg - Int).
*   `diastolic`: Küçük Tansiyon (mm Hg - Int).
*   `pulse`: Nabız (bpm - Int).
*   `timestamp`: Ölçüm zamanı (DateTime).
*   `note`: Kullanıcı notu (Opsiyonel - String).

## 3. Özellikler ve İş Akışı

### 3.1 Ana Sayfa (Dashboard)
*   **Bugünün İlaçları:** O gün alınması gereken ilaçların listesi ve onay kutucukları (Checkbox).
*   **Hızlı Eylem Butonu (FAB):** "İlaç Ekle" veya "Tansiyon Ölçümü Ekle" seçenekleri.
*   **Son Tansiyon:** En son girilen tansiyon değerinin özeti.

### 3.2 İlaç Yönetimi
*   **Ekleme:** İlaç adı, dozu, saati ve hatırlatma sesi seçimi.
*   **Düzenleme/Silme:** Mevcut ilaç planını güncelleme.
*   **Geçmiş:** Alınan/Atlanan ilaçların tarihçesi.

### 3.3 Tansiyon Takibi
*   **Kayıt:** Büyük, küçük tansiyon ve nabız girişi.
*   **Liste:** Geçmiş ölçümlerin tarih sırasına göre listesi.
*   *(Gelecek Faz)*: Basit bir çizgi grafik ile tansiyon değişimi.

### 3.4 Ayarlar
*   Bildirim sesleri.
*   Verileri yedekleme/geri yükleme (Yerel dosya olarak).

## 4. Geliştirme Aşamaları (Fazlar)

### Faz 1: Kurulum ve Temel Yapı
1.  Flutter projesinin oluşturulması (`flutter create saglik_takip`).
2.  Gerekli paketlerin `pubspec.yaml` dosyasına eklenmesi (hive, flutter_riverpod, vb.).
3.  Temel klasör yapısının (models, screens, services, widgets) oluşturulması.

### Faz 2: Veritabanı ve Modeller
1.  Hive adaptörlerinin ve modellerin (Medication, BloodPressureRecord) yazılması.
2.  Veritabanı servisinin (Repository Pattern) oluşturulması.

### Faz 3: Tansiyon Takibi Modülü
1.  Tansiyon Ekleme Ekranı tasarımı.
2.  Tansiyon Geçmişi Listesi tasarımı.
3.  Verilerin kaydedilmesi ve listelenmesi mantığının entegrasyonu.

### Faz 4: İlaç Hatırlatma Modülü
1.  İlaç Ekleme Ekranı (Form yapısı).
2.  Ana Sayfa "Bugünün İlaçları" arayüzü.
3.  Bildirim servisinin (`NotificationService`) yazılması ve alarmların kurulması.

### Faz 5: Test ve İyileştirme
1.  Farklı cihazlarda test (Emülatör ve Fiziksel Cihaz).
2.  Bildirimlerin zamanında gelip gelmediğinin kontrolü.
3.  Hata ayıklama ve UI düzeltmeleri.

## 5. Doğrulama (Verification)
*   Uygulama açılıyor mu?
*   Yeni bir ilaç eklendiğinde veritabanına kaydoluyor mu?
*   Belirlenen saatte bildirim geliyor mu?
*   Tansiyon verisi eklenip listede görüntüleniyor mu?
*   Uygulama kapatılıp açıldığında veriler korunuyor mu?
