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
- Durum: iskelet başlamadı. **13 Kas:** kullanıcı iki Excel verdi (personel başına ayrı sayfa, ay ay sütun: tarih / çalıştığı gün / günlük ücret; ücret formülün içine gömülü ve aylara göre değişiyor; gün sayısı 0-1-2-3 olabiliyor (fazla mesai gün birimiyle); elle yazılmış tutarlar, RESMİ günü, eksik gün düşümü, yol satırı, ÖDENDİ notu; bir personel saat ücretli, ayrı dosya). WhatsApp: üye olduğu için sigortası yapılamayan personel = asgari ücret + aylık sigorta parası + günlük yol parası; deneme süreli yeni personel ilk 2 ay yarım ücret. **Kullanıcı Nagihan Hanım'a 4 soru yazdı (cevap bekleniyor):** kaç personel/hepsi çalışıyor mu; gün sayısı mı saat mi; mali müşavire ne gidiyor (toplam/gün gün); yol-sigorta parası sabit mi gün sayısına göre mi. Cevap gelmeden kod yok. Tasarım notu: ücret ayrı alan, tarihe göre değişebilir olmalı.
- **14 Kas:** Nagihan Hanım cevapladı (9 kişi; gün sayısı kalsın; müşavirin kendi sistemi var, eksik/resmi/hafta tatilini elle giriyor; yol parası yalnız Nermin Hanım + kendisi, günlük 250 TL geldiği gün). Kullanıcı "esnek kur, cevaplar bloklamasın" dedi → modül yazıldı, yerelde test edildi, **canlıya alma onayı bekliyor**. Ayrıntı: MUHASEBE-PLANI.md en üstü.

### 4. Stok grupları + kod düzeni (13 Kas 2026, Fatih Bey yazılı teyidiyle) — CANLIDA (ac6d76d)
- **Teyit edilenler:** Ad + Grup(tür) + Birim zorunlu; Depo/KDV/asgari/fiyat opsiyonel; KDV boşsa %1; yeni birim gerekmiyor; kod noktasız görünsün (15010003 = 150 + alt grup 10 + sıra 003), son 3 hane isteğe bağlı elle; "Yardımcı malzeme" türü (temizlik 60, kıyafet 80); gruplar koda gömülü değil tabloda, ekleme yalnız operasyon yöneticisi + bilgi işlem (+destek); aynı ana/alt grup varsa kaydetmez. Fatih Bey'in listeleri: 150 → 10,12,14 hammadde; 30-33 ambalaj; 60 temizlik; 80 kıyafet. 152 → 01 makarna mantı, 02 sarma, 03 içli köfte, 04 gözleme, 05 çörek, 11 su böreği, 12 çiğ börek, 13 kol böreği. 151 ve 153 listesi henüz yok (tek grup 01 olarak duruyor).
- **Yapıldı (yerelde):** migration `20261113100000_stok_yardimci_turu.sql` + `20261113110000_stok_gruplari.sql`, `/stok/gruplar` ekranı, kart formunda grup + kod son hane, noktasız kod gösterimi (yalnız stok ekranlarında; alış/satış/fiş/hesap planında hâlâ noktalı). tsc + eslint temiz.
- **Canlıya alındı (13 Kas):** iki migration uygulandı (21 grup, Fatih Bey'in resimlerindeki gruplar tamam), kod main'de. Yolda 2 hata çıktı ve düzeltildi: (1) ANA_GRUPLAR istemci dosyasından sunucu sayfasına aktarılıyordu, Stok grupları ekranı açılmıyordu; (2) kayıttan sonra grup kutusu ekranda dolu görünüp form içinde boş kalıyordu (React form eylemi sonrası formu kendisi sıfırlıyor), kod alanı kapanıyordu; alanlar kayıttan sonra baştan kuruluyor, hatada yazılanlar korunuyor. Kod+grup formun en üstünde. **Hâlâ yapılmadı:** Kılavuz'a anlatım; alış/satış/fiş ekranlarında kod noktalı (Fatih Bey'e sorulacak: hepsi noktasız mı olsun); 151/153 grup listesi bekleniyor; Fatih Bey'in gerçek denemesi (kayıttan sonra yeni kart + hata sonrası değer koruma) görülmedi; rol yetkisi (Nagihan Hanım'da grup formu gizli mi) canlıda denenmedi. Eski 150.01/150.02 grupları kartı yoksa kapanır; 152.01 adı "Makarna Mantı Grubu" olur (test kartları o gruba düşer, 25 Kas'ta silinecek).

### 5. Test dönemi uzatıldı (13 Kas 2026, kullanıcı)
- **⛔ Kullanıcı kuralı (13 Kas): çalışanlar şu an veri giriyor; bana sormadan hiçbir veri silinmez.** Aşağıdaki dönem sonu temizliği de önce listelenip onaylanmadan yapılmaz.
- Bitiş 25 Kas → **30 Kas 2026** (`src/lib/test-donemi.ts`, şerit buradan okur). Dönem sonunda: test kartları/kayıtları sil + sayaçları sıfırla + açılış ayarını sıfırla + şeridi `null` yap; **stok grupları ve hesap planındaki grup hesapları silinmez** (grup tanımı gerçek yapı); kartları tutma kararı o gün sorulur.

## Bitenler
(henüz yok)
