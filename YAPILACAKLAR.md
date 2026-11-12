# İMECE — Yapılacaklar Listesi

> Kullanıcı aklına geldikçe söyler, buraya eklenir. "Yapılacakları söyle" denince bu dosyadan okunur.
> Biten madde silinmez, "Bitenler" bölümüne tarihiyle taşınır.

## Açık

### 1. Notlar yalnız ilgili kişilere görünsün (12 Kas 2026, kullanıcı)
- **Sorun (kodda doğrulandı):** `src/app/(uygulama)/notlar/page.tsx` notları kimseye göre süzmüyor; veritabanı okuma kuralı da giriş yapan herkese açık (`20261111280000_not_medya.sql` yorumu: "notları zaten giriş yapan herkes görüyor"). Yani Fatih Bey'e yazılan not Nagihan Hanım'a da görünüyor.
- **İstenen:** bir not yalnız gönderene ve alıcılarına görünsün. "Herkes" seçilmiş notu herkes görür.
- **Karar verilecek:** (a) Başkan/Operasyon yöneticisi her notu görsün mü? (b) Teknik destek/bilgi işlem görsün mü (KVKK açısından önerim: hayır)? (c) Telegram'dan gelen notta "gönderen" kim sayılacak (`telegram_gonderen` ile profil eşleşmesi)?
- **Yapılış önerisi:** süzmeyi yalnız sayfada değil **veritabanı okuma kuralında (RLS)** yap; sayfa süzmesi tek başına olursa veri API'den hâlâ okunabilir. Medya depolama alanı (`not-medya`) kuralı da aynı kurala bağlanmalı.
- **Kontrol edilecek:** Hatırlatıcılar için de aynı durum var mı (alıcı seçiliyor, ama okuma kuralı bakılmadı).
- **Kararlar (12 Kas, kullanıcı):** Başkan/Operasyon yöneticisi başkasının kişiye özel notunu GÖRMEZ; "Herkes" seçilen not seçilen herkese görünür; alıcısız (genel) not herkese görünür; bilgi işlem/teknik destek için uygulamada özel "tüm notları gör" yetkisi YOK (hata araştırmada önce test notu; gerçek not içeriği için gönderen/alıcıdan izin; unutma: veritabanı erişimi teknik olarak var, bu bir söz/kural meselesi).
- **Yapıldı (yerelde, canlıya alınmadı):** `supabase/migrations/20261112100000_not_gorunurluk.sql` (notlar okuma kuralı + `not-medya` depo kuralı), ekran/kılavuz metinleri güncellendi. Canlı veritabanında geri alınan işlemle 9 kontrol geçti (a/b/c kişileri, medya dosyası, başkasının notunu güncelleme/silme, girişsiz).
- **Canlıya alma sırası:** önce `supabase db push`, sonra main'e push. Hatırlatıcılar için aynı sorun bakılmadı, ayrı madde.

### 2. Lokanta/cafe ön çalışması (12 Kas 2026, kullanıcı)
- Kooperatif lokanta/cafe açacak; kullanıcı bunu İMECE'nin yanına modül olarak (stok, reçete, menü, adisyon, muhasebe) yapmak istiyor; ücretli iş olarak düşünüyor.
- Önce öğrenilecek: kooperatifin planı (tür, tarih, menü büyüklüğü), POS/yazarkasa kararı ve satış dökümü verip vermediği, hak sahipliği/ücret konusunun yazılı netleştirilmesi.
- Henüz kod yok; ön çalışma dokümanı hazırlanacak.

### 3. Personel hak ediş modülü — kapsam netleşti (12 Kas 2026, kullanıcı)
- **Kapsam:** resmi bordro/maaş hesabı YOK (vergi, SGK, net-brüt mali müşavirde kalır). İMECE yalnız **kim ne kadar hak ediş yaptı**ı hesaplar (aylık sabit / saatlik × çalışılan saat / fazla mesai) ve mümkünse **mali müşavire aktarılabilir çıktı** verir.
- **Bilinmeyen:** mali müşavirin hangi biçimde veri istediği (kooperatifin müşaviri kim, henüz yok); çıktının biçimi onun isteğine göre kurulmalı. Nagihan Hanım'ın Excel'i günlük takibin nasıl yapıldığını gösterir.
- **Yetki dikkati:** maaş/hak ediş Excel'i mevcut genel rapor-excel ucundan çıkmamalı (muhasebeci rolü orayı kullanıyor); ayrı, yalnız Başkan + Operasyon yöneticisi + ön muhasebe yetkisiyle. İşlem Geçmişi'ne tutar yazılmamalı. Ayrıntı: `project_personel-maas-modulu` hafızası.
- Durum: iskelet başlamadı; onay bekliyor.

## Bitenler
(henüz yok)
