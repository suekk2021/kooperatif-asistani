# Kooperatif Asistanı → Stok + Üretim + Cari + Muhasebe Kodlu Takip Sistemi — Aksiyon Planı

> **Durum (7 Kasım 2026):** Plan onaylandı, Faz 0 (bilgi toplama) aşamasındayız — henüz kod yazılmadı. Kullanıcının notları ve ortak şirketin muhasebe programı/aktarım şablonu bekleniyor. Bu plan `suluova-kooperatif` klasöründe yanlışlıkla açılan oturumda hazırlandı; "Yanlış klasördeyiz" maddesi artık geçersiz.
>
> **Güncelleme (7 Kasım 2026, kooperatif-asistani oturumu):**
> - Ortak şirketin programı: **Mikro**. (Hangi ürün/sürüm — Jump, Fly, Run — ve kooperatif orada ayrı firma mı, henüz bilinmiyor.)
> - **Hizmet devam ediyor** — kooperatif darboğazdan çıktı, ödeme kilidi kullanılmayacak. `proxy.ts`'teki kilidin commit edilip edilmeyeceği (env var'la kapalı anahtar olarak) hâlâ karar bekliyor.
> - Kullanıcının akış fikri (yarım kaldı): giriş → tedarikçiler → stok → tahsilat → üretim (üretimin neyle/nasıl yapıldığı anlatılacak).
> - **Kritik açık soru (muhasebeciye):** Mikro'ya sadece yevmiye fişi mi aktaracağız, yoksa fatura + cari hareket + stok hareketi mi? Mikro stok/cari/muhasebeyi tek programda tutar; sadece yevmiye fişi gönderilirse Mikro'daki stok ve cari modülleri boş kalır. Fatura/hareket aktarılırsa yevmiyeyi Mikro kendi üretir ve bizdeki çift taraflı muhasebe motoru (Faz 1) çok sadeleşebilir. Cevap Faz 1'in kapsamını belirler.
> - E-faturayı kim kesiyor (Mikro'dan mı)? Satış faturası Mikro'da doğuyorsa veri yönü tersine döner (Mikro → biz).
>
> **Güncelleme 2 (7 Kasım 2026):**
> - **Üretim:** donuk hamur işi / gıda — börek, çörek, içli köfte, su böreği. Ürünler -18°C'de dondurulup paketleniyor/ambalajlanıyor. Bugüne kadar reçete/kayıt sistemi yok, "ezbere" yürüyor.
> - **Programın asıl amacı:** kaçakları bulmak — üretimde fire, zaman kaybı, nakit kaybı. Fire oranı bilinmiyor; sistem girdi–çıktı farkından hesaplayacak.
> - **Aktarım:** her şey **genel Excel çıktısı** olarak (hesap kodu sütunlarıyla) hazırlanacak; Mikro'ya özel şablon sonradan eklenir. Muhasebeci soru listesi önceliği düştü.
>
> **KAPSAM TANIMI (kullanıcının sözüyle, 7 Kas 2026):** "Tam teşekküllü bir muhasebe yazılımı yapmıyoruz. Bir işletmenin işleyişinin ve mali durumunun fotoğrafını çeken bir yazılım yapıyoruz ve istedikleri şekilde Mikro'ya aktarabilecekleri çıktıyı vereceğiz." Kullanım ve veri girişi kooperatifin sorumluluğunda. Sonradan gelen değişiklik/ekleme istekleri bu tanıma göre değerlendirilir: fotoğrafı netleştiriyorsa veya aktarım için gerekliyse alınır; yasal defter, bordro, e-fatura kesme, beyanname gibi tam muhasebe işleri kapsam dışı (Mikro'da kalır).
>
> **Güncelleme 4 (7 Kasım 2026, akşam) — NEREDE KALDIK:**
> - **Program adı: İMECE** (kalın, üstte) → altında "Suluova Üreten Eller" → altında "Üretim · Muhasebe · İş Takibi". "Terazi" önerisi geçersiz. Başkan: Canan Bağcı Oral.
> - **Tasarım taslağı** `tasarim-taslagi/index.html`: 14 ekran, karanlık/aydınlık mod, açıklama modu (sarı ? düğmesi), her ekranda "Muhasebe karşılığı" kutusu, Hesap Planı ekranının sonunda muhasebeciye 6 soru. **Kodlamaya bu tasarımla başlanacak.**
> - Responsive düzeltildi (320–1440 px tarandı, sayfa yana taşmıyor): telefonda (≤640 px) tablolar kart görünümüne geçiyor; 1200 px altında iki sütunlu düzen teke iniyor, özet kartları 2×2; üst bar dar laptopta tek satır. Kalan bilinçli tercih: 9 sütunlu Aktarım ve Stok tabloları tablet genişliğinde kendi kutusu içinde yana kayıyor.
> - **Yayın:** https://imece-omega.vercel.app (kooperatifin Vercel hesabı, proje "imece", Vercel Drop ile zip yükleniyor; imece.vercel.app başkasının). Herkese açık, sadece örnek veri. Responsive düzeltmesi henüz bu linke yüklenmedi.
> - **Eski sistem kilitli kalıyor** (`HIZMET_DURDURULDU=true` Vercel'de duruyor, kaldırılmayacak). Yeni sistem yerelde geliştirilecek, hazır olunca eskinin yerine geçecek. Telegram botu belki hiç kullanılmayacak; yapı olduğu gibi kalsın.
> - **Sıradaki:** Kullanıcı tasarımı cuma değerlendirecek; "başla" demeden kod yok. Muhasebeci cevapları beklenirken önerilen yol: aktarıma bağlı olmayan kısımlar (stok, üretim/fire, alış-satış, cari, kasa) önce; hesap kodları ayardan değiştirilebilir tutulacak; Mikro aktarımı cevaplar gelince en sona. Kullanıcı kararı henüz net değil ("cevap gelmeden başlamayalım" dedi, öneri sunuldu).
>
> **Güncelleme 6 (9 Kasım 2026) — KODLAMA BAŞLADI, NEREDE KALDIK:**
> - Kullanıcı "başla" dedi. Kararlar: ayrı test Supabase'i **yok**, canlı proje (`judxqcq…`) doğrudan kullanılıyor (eski sistem ~1 hafta denendi, veri önemsiz). Eski program **tamamen iptal**, hizmet kilidi kodu kaldırıldı (proxy, webhook, hatırlatma cron'u, notlar, `public/hizmet-durduruldu.html`). Vercel'deki `HIZMET_DURDURULDU` env var'ı yeni sürümün ilk deploy'unda silinecek (o zamana kadar canlıdaki eski kod kilitli kalmalı, yoksa silinen tablolar yüzünden hata verir).
> - Yedek: `yedek/2026-11-09_*.json` (git dışı) — 18 işlem, 1 müşteri, profiller, notlar, hatırlatıcılar, ayarlar.
> - **Adım 1 (çekirdek) CANLIDA:** `supabase/migrations/20261109120000_imece_cekirdek.sql` — `islemler`/`musteriler` silindi; hesap planı (63 hesap), KDV (0/1/10/20 → 191.xx/391.xx), depolar, cariler (kod otomatik 120.01.NNN / 320.01.NNN), stok kartları (150.01/150.02/151.01/152.01/153.01 altında otomatik), yevmiye (borç=alacak, en az 2 satır, sadece alt hesaba kayıt, değiştirilemez, ters fişle iptal), dönem kilidi, değişiklik kaydı, RLS. 20 senaryo testi geçti (işlem içinde, geri alındı).
> - 3 eski migration (20260704040000/050000/060000) uygulanmış ama kayıtsızdı → `migration repair` ile kaydedildi.
> - **Varsayım (muhasebeciye teyit):** stok kartlarına da kart başına muhasebe alt hesabı açılıyor (150.01.001 Un). Mikro'da stok kartı genelde grup hesabına (150.01) bağlanır; istenirse tek hesaba indirgenir.
> - **İskelet hazır (9 Kas akşam, yerelde, deploy edilmedi):** taslağın görünümü (`src/app/imece.css`, taslaktan birebir) + yan menü/üst bar/karanlık mod (`src/components/iskelet/`). Çalışan ekranlar: Ana Panel (sayılar + kurulum adımları + hatırlatıcılar), Cariler (müşteri/tedarikçi sekmeli, ekleme, bakiye), Stok (kart açma, tür filtresi, ad önerisi), Hesap Planı (sınıflı, bakiyeli). Yer tutucu: Alış, Üretim, Satış, Kasa, Raporlar, Aktarım, İşler, Asistan. Eski gelir/gider/müşteri/rapor ekranları silindi; Notlar, Hatırlatıcılar, Ayarlar, Hesabım korunuyor. `hesap_bakiyeleri` görünümü canlıda. Rol testleri geçti (ön muhasebe kart açar, fiş kesemez/hesap planını değiştiremez; anonim hiçbir şey göremez). `npm run build` temiz.
> - Telegram botu: "özet" artık kart sayıları + hatırlatıcılar; fotoğraf gelirse "yakında" diyor.
> - **Adım 2 CANLIDA (9 Kas gece, ekranlar yerelde):** `20261110100000_kasa_alis_stok.sql` — kasa/banka/POS/kredi kartı hesapları (kod 100/102/108/300 altında 2 hane), stok hareketleri (hareketli ortalama maliyet, `stok_durumu` görünümü), alış faturası (stok kalemi veya gider/demirbaş kalemi 25x/26x/7x0; aynı tedarikçinin aynı fatura no'su engelli; toplamlar veritabanında hesaplanır), peşin ödeme ayrı ödeme kaydı olarak, tahsilat/ödeme/virman (POS→banka komisyonu 780), iptal = ters kayıt (stok + fiş + bağlı ödeme). 28 senaryo testi geçti. Ekranlar: Kasa ve Banka (hesap açma, tahsilat/ödeme/virman, hareketler + muhasebe karşılığı, iptal), Alış listesi, Yeni alış (kalem bazlı, canlı toplam ve muhasebe önizlemesi), Alış detayı (fişler, iptal). Stok ekranı miktar/ortalama maliyet/değer gösteriyor.
> - **Henüz yok:** açılış bakiyeleri (kasa/banka/cari/stok) — **muhasebeciye sorulacak: açılış fişinin karşı hesabı ne olsun?** (Mikro'da zaten açılış var; bizdeki sadece fotoğraf için.) Faturayı fotoğraftan okuma (OCR) Alış'a henüz bağlanmadı. Çek al/ver yok. Stok kartından alış ekranında yeni kart açma yok (önce Stok ekranından açılıyor).
> - **Adım 3 CANLIDA (Satış + cari ekstre):** `20261110120000_satis.sql` — satış faturası (sadece Ürün/Ticari mal kartları; iç no SAT-n, isteğe bağlı e-fatura no tekil), tek fiş: B 120 / A 600.01 / A 391.xx / B 620.01|621 / A 152|153; peşin satışta tahsilat ayrı kayıt (kasa/banka/POS 108); iptal = ters kayıt. **Stokta olmayan ürün satılabilir** (üretim gelene kadar mamul stoğu 0; engellemek ekranı kullanılmaz yapardı) — maliyet son giriş maliyetinden ya da 0, kalem `maliyet_tahmini` işaretli, stok eksiye düşer. 22 senaryo testi geçti. Ekranlar: Satış listesi (ciro/maliyet), Yeni satış (stokta kalan gösterimi, tahmini brüt kâr, muhasebe önizlemesi), Satış detayı, **Cari ekstre** (`/cariler/[id]`, yevmiyeden yürüyen bakiye, belgelere bağlantı).
> - Bilinen: `npm run build` dev sunucusu açıkken ara sıra "next/font/google queries have exactly one entry" hatası veriyor; tekrar çalıştırınca geçiyor. Deploy günü ilk derlemeyi izle.
> - **Adım 4 CANLIDA (Üretim):** `20261110140000_uretim.sql` — parti_baslat → parti_girdileri (açıkken eklenir/silinir; sadece hammadde/ambalaj/yarı mamul) → parti_tamamla (girdiler ortalama maliyetle stoktan düşer, ürün lot + SKT ile girer; fiş B 710 / A 150.xx + B 152.xx / A 711; normal fire maliyette) → parti_iptal (ters kayıt). Reçete (isteğe bağlı, "N birim için"), ürün kartında `satis_fiyati` (liste fiyatı; satış ekranına otomatik gelir). 22 senaryo testi geçti. Ekranlar: Üretim (açık partiler kartı + başlat + liste: fire %, süre, birim maliyet), Parti ekranı (telefon öncelikli: büyük tartım girişi, bitir formu, fire nedeni, SKT varsayılan +6 ay; kapanınca paketlenen/fire/verim/birim maliyet/marj + reçete sapması %5 üstü sarı), Reçeteler. Birim maliyet şimdilik sadece malzeme; işçilik/genel üretim payı ay sonu dağıtımıyla (Raporlar).
> - **KİŞİLER (9 Kas, Canan Hanım ile görüşme):** **Fatih Bey** = operasyon yöneticisi (ortak şirketin genel müdürü; üretim + finans takibi), **Canan Hanım** = başkan (temsil), **Nagihan Hanım** = ön muhasebe (kooperatifteki iş). İleride depo/üretim görevlisi ve ortak şirketin muhasebecisi eklenebilir.
> - **Roller CANLIDA:** `20261110160000_roller.sql` — yeni roller `operasyon` (yönetici: her şey + kişi ekleme), `depo` (kayıt girer), `muhasebeci` (her şeyi görür, kayıt giremez); `profiller.gorev` serbest görev yazısı. `yonetici_mi()` = başkan|operasyon; `baskan_mi()` artık bunu çağırıyor; `yazabilir()` izleyici+muhasebeci hariç. Panelden elle eklenmiş profiller/ayarlar update kuralları migration'a alındı. Başkan rolünü sadece başkan verir/alır. Rol listesi tek yerde: `src/lib/roller.ts` (DB fonksiyonlarıyla aynı tutulmalı). Ayarlar → "Kişiler ve yetkiler" yeniden yazıldı. Not: `depo` ile `on_muhasebe` şu an aynı yetkide; ekran bazlı kısıt gerekirse mesajlaşma adımında.
> - **Hesaplar (9 Kas):** Ali Kaan Posta (akposta@gmail.com) → **Teknik destek** (`destek` rolü, `20261110180000_teknik_destek.sql`): yönetici yetkisi, ama kişi seçme listelerinde/@/bildirimlerde görünmez; Ayarlar'da "operasyonda görünmez" etiketiyle görünür, değişiklikleri kayda geçer, yöneticiler silebilir (kullanıcıya gerekçe: KVKK + ortak şirketin güveni — tamamen gizli hesap önerilmedi). Canan Bağcı Oral = başkan (hesap var), Nagihan Doğan = ön muhasebe (hesap var; şimdilik üretim/depodan da sorumlu — ön muhasebe rolü hepsini kapsıyor). **Fatih Bey'in hesabı yok** — kullanıcı e-postasını alacak, canlıya alırken birlikte açılacak (rol: Operasyon yöneticisi; tüm operasyonu yönetir). Başkan tamamen temsil (ziyaret, misafir, tanıtım) ama rolü yetki olarak tam kalıyor.
> - Yeni kişi seçen her ekran (görev, @, bildirim) `OPERASYON_DISI_ROLLER` (`src/lib/roller.ts`) ile destek hesabını dışarıda bırakmalı.
> - **KARAR (9 Kas, kullanıcı):** Kullanıcı teslimden sonra uygulamada hesap tutmayacak ("sistemi yapan biziz, sunucu tarafından müdahale ederiz"). Silinemez hesap önerisi reddedildi (KVKK: veri sorumlusu kooperatif, erişimi kapatabilmeli). Geliştirme süresince akposta hesabı (Teknik destek) kalıyor çünkü yerel test canlı veritabanına bu hesapla giriyor.
> - **TESLİM GÜNÜ LİSTESİ:** (1) akposta@gmail.com uygulama hesabını sil (gerekirse sonradan geçici destek hesabı açılıp kapatılır); (2) ~~sözleşmeye sunucu erişimi maddesi~~ — gerek yok: kullanıcı kooperatifin sigortalı çalışanı (9 Kas), erişim kurum içi; isteğe bağlı olarak görev tanımına "yazılım bakımı ve teknik destek" yazılabilir; (3) Vercel `HIZMET_DURDURULDU` env var'ını sil + deploy; (4) Fatih Bey hesabı (Operasyon yöneticisi); (5) `/guvenlik-taramasi`; (6) **deneme kayıtlarını temizle** (kullanıcı 9 Kas'ta "DENEME" önekli kartlarla deneme turu yaptı; fiş/hareket tabloları silmeyi engellediği için tek seferlik, tetikleyicileri geçici kapatan bir temizlik migration'ı — önce yedek; **numara sayaçlarını da sıfırla**: satis_no, parti_no, fis_no — geri alınan testler sayaç tükettiği için gerçek ilk satış SAT-2 oldu); (7) açılış bakiyeleri ve ilk sayım.
> - **YENİ SIRA (9 Kas, kullanıcı onayladı) — mesajlaşmadan önce eksikler:** (1) ✅ kart düzenleme + pasife alma; (2) sayım ekranı + açılış stoğu; (3) açılış bakiyeleri (muhasebeci cevabı bekleniyor: açılış fişinin karşı hesabı, açılış tarihi, Mikro şablonu — kullanıcıya hazır mesaj metni verildi); (4) raporlar (mizan, KDV özeti, fire/kaçak, kârlılık, alacak yaşlandırma) + ay sonu maliyet dağıtımı (720/730) + Excel aktarım; (5) mesajlaşma + görev. Ayrıca eksik: çek al/ver, kısmi iade, fatura OCR'ı Alış'a bağlama, dönem kapatma ekranı, kart birleştirme, lot/SKT uyarısı.
> - **Kart düzenleme (9 Kas):** cari düzenleme ekstre sayfasında ("Bilgileri düzenle"), stok kartı için yeni `/stok/[id]` sayfası (miktar/değer/ortalama/liste fiyatı + düzenleme + hareket geçmişi, belgelere bağlantı, yürüyen kalan). Kurallar: kod ve tür değişmez (DB); hareketi olan kartın birimi değişmez; bakiyesi/stoğu sıfır olmayan kart pasife alınamaz. Listelerde "Pasif kartlar / Pasif cariler" sekmesi (yeniden aktif etmek için).
> - **Deneme turu (9 Kas akşam) TAMAM:** kullanıcı muhasebe bilgisi olmadan adım adım yönlendirmeyle zinciri bitirdi (kartlar → alış DEN-001 → çift fatura engeli → üretim 48 adet/fire %4/birim 14,58 → satış 50 yanlış girildi → SAT-2 iptal → SAT-3 20 adet → tahsilat → ödeme). Defter dengede; net durum = brüt kâr = 908,33 ₺ (iki yoldan aynı). Bulunan hata: eksik alanda Kaydet sessizce kapalıydı → düzeltildi (4 formda). Kalan DENEME kayıtları teslim temizliğinde silinecek.
> - **YARDIM / KILAVUZ (karar, teslimden önce):** (1) ekran içi "?" açıklama modu — taslaktaki `data-not` metinleri programa taşınacak; (2) "Nasıl yaparım?" sayfası — görev başına kısa tarif (deneme turu adımları ilk taslak) + tesise basılı tek sayfa "parti nasıl girilir"; (3) AI "Sor" kutusu — test sürümü geri bildiriminden sonra, sadece kılavuz metni + sistemdeki gerçek veriden cevap verecek şekilde (serbest muhasebe tavsiyesi yok). Kullanıcı Rezerva'daki AI yardımını örnek gösterdi; içini anlatırsa uyarlanacak. 1-2 ekranlar oturunca yazılacak (iki kez yazmamak için).
> - **Açılış CANLIDA (9 Kas gece):** `20261110200000_acilis.sql` — `acilis_ayarlari` (tarih + karşı hesap, sadece yönetici; muhasebeci cevabı gelince girilecek), `acilis_kaydet` (para/cari/stok, fark karşı hesaba, parça parça girilebilir), `acilis_iptal`. 14 senaryo testi. Ekran `/acilis` (3 sekme, "daha önce girilen" sütunu, açılış kayıtları + iptal); Panel kurulum adımı bağlandı. Kullanıcı kararı: açılış verilerini kooperatif canlıya geçince kendisi girecek.
> - **Sayım CANLIDA (9 Kas gece):** `20261110220000_sayim.sql` — `sayimlar` + `sayim_kalemleri` (sistem miktarı kayıt anındaki miktar), `sayim_kaydet`/`sayim_iptal`; fark ortalama maliyetle stoğa işlenir; fiş: eksik B 197 / A 15x, fazla B 15x / A 397 (TDHP sayım hesapları, 197/397 hesap planına eklendi; muhasebeci kapatır). Farksız sayım fiş üretmez. 11 senaryo testi. Ekranlar: `/stok/sayim` (tür filtresi, canlı fark ve tutar, boş = sayılmadı), `/stok/sayim/[id]` (eksik/fazla/tutan kart, fiş, iptal); Stok'ta "Sayım yap" düğmesi; stok kartı hareketinden sayıma bağlantı. Kaçak raporu bu kayıtlardan beslenecek.
> - **Ayırma sorusu (9 Kas):** kullanıcı muhasebe ile iş takibini iki programa ayırmayı sordu → ayrılmadı (aynı veri: parti→stok/maliyet, sipariş→satış→tahsilat; iki giriş/senkron/bakım yükü). Kafa karışıklığı **role göre menü** ile çözüldü: `Iskelet.tsx` MENU öğelerinde `kimler`; "yakında" bölümler gizli; yönetici (başkan) listesinde olmayanlara "Diğer bölümler"den ulaşır; Ayarlar bağlantısı sadece yöneticide. (Menü sadelik içindir, güvenlik DB'de.)
> - **AI BRİFİNG FİKRİ (9 Kas, kullanıcı):** her role kendi özeti — Fatih Bey "bugün ne durumdayız", Canan Hanım "misafir hazırlıkları/ileriye dönük program", Nagihan Hanım "bugün ne gireceğiz/üretimde aksaklık", muhasebeci "rapor hazır mı". Karar: yapılacak ama **rakamı AI uydurmaz** — sunucu rol bazında gerçek veri paketini hazırlar, AI sadece okunur brifinge çevirir/önceliklendirir, her cümle kaynağa bağlantılı. Mevcut `src/lib/ai.ts` (Gemini/OpenAI) kullanılır. **Sıra:** rol menüsü ✅ → sayım → raporlar → mesajlaşma+görev → AI brifing (Canan Hanım'ın sorusu görev verisine, muhasebecininki raporlara bağlı).
> - **Ürün değil (9 Kas, kullanıcı netleştirdi):** program kooperatife özel, kullanıcı kooperatifin çalışanı olarak yapıyor; başka işletmelere satılmayacak → genelleştirme/çok-kiracılı yapı için çaba harcanmaz.
> - **Sesle veri girişi (9 Kas):** her yere değil. Değerli olduğu yer: üretimde tartım (eller unlu/eldivenli) ve not/hatırlatıcı/görev. Alış faturasında fotoğraf (OCR) daha iyi; satış/kasa/cari masa başı, ses hata riski getirir. Karar: **önce Alış'a fatura fotoğrafı okuma** (eski `src/lib/fis.ts` + `actions/ocr.ts` kalem bazlı okumaya çevrilecek, okunan forma dolar, kullanıcı onaylar — AI asla kendi kaydetmez); **üretim mikrofonu sonra** ve ancak tesiste çalışan "telefonda yazmak zor" derse (söylenen → "DENEME Un · 30 kg, ekleyeyim mi?" onayı).
> - Kullanıcıdan beklenenler: muhasebeci cevabı, Nagihan Hanım'dan açılış bilgileri (kasa/banka bakiyeleri, cari borç-alacak listesi, depo sayımı), Fatih Bey e-postası, ürün liste fiyatları/reçeteler, localhost'ta gerçek kayıtla alış→üretim→satış deneme turu.
>
> **BEKLEYEN TASARIM — Görev ve Telegram bildirim yönlendirme (9 Kas 2026, acil değil):**
> - Kullanıcının isteği: Telegram bildirimi herkese değil, ilgili kişiye gitsin; başkan iş verir, takip eder.
> - Bugünkü kod: not bir kişiye atanınca sadece ona gider ✅; **hatırlatıcılar Ayarlar'daki listedeki herkese gidiyor** ❌ (kişi seçilemiyor); görev modülü yok.
> - Önerilen kurgu (rol bazında, dar tutulacak — başkan, ön muhasebe, üretim+depo sorumlusu): kişi bota /start + kısa kodla kendini eşler (bire bir, grup yok); görev kartı (ne, kime, son tarih, bağlı kayıt, durum Verildi→Görüldü→Yapılıyor→Bitti); Telegram düğmeleri [Gördüm][Başladım][Bitti][Sorun var]; bildirim sadece sorumlu + işi veren; gecikmede sorumlu + başkan; sabah herkese kendi işleri, başkana herkesin özeti; sistem uyarıları role göre (stok→depo, SKT→satış, vade→başkan+ön muhasebe, fire→parti sorumlusu+başkan); hatırlatıcı kişiye atanır; başkan Telegram'dan görev verebilir.
> - **Sırası gelince (Üretim modülü civarı) kullanıcı Canan Hanım'a soracak:** kaç kişi, kim hangi işten sorumlu; üretim/depo kişileri sadece Telegram'dan mı çalışacak (web hesabı olmadan)?
> - **KARAR (9 Kas 2026): Telegram'a yeni özellik eklenmeyecek; ana kanal programın kendisi.** Telefona uygun web uygulaması (PWA, "ana ekrana ekle") + program içi bildirim kutusu + telefona bildirim (web push). Mevcut bot (hatırlatıcı/not) dokunulmadan kalır; test sürümünde kullanılmazsa kaldırılır. Gerekçe: eski veride muhasebe kayıtlarının 17/18'i web'den girilmiş; Telegram iki ayrı arayüz ve chat-id eşleştirme yükü getiriyor.
> - **Kişiler (9 Kas):** Başkan iPhone kullanıyor, **sadece temsil görevinde** (operasyon takibi yapmayacak). Ön muhasebe Android. Üretim/depo/operasyon takibini muhtemelen yeni ortaktan bir profesyonel yapacak — kim olduğu belli değil, öğrenilince kurulum yapılır. Altyapı iPhone + Android ikisine de hazır olmalı (iPhone'da web push için ana ekrana ekleme şart, iOS 16.4+ — kurulumda yardım edilecek). Rol tasarımında "başkan" yerine **operasyon sorumlusu** gecikme/özet bildirimlerini alır; başkan sadece kendi istediği özetleri.
> - **Düzeltme (9 Kas, kullanıcı):** Başkan programı kullanacak ama temsil tarafında — çalışanlara **talimat/görev verecek** (misafir hazırlığı, çiçek/hediye yaptırma gibi). Görev sistemi başkanın görev vermesini de kapsamalı; operasyonel takip (üretim/fire/stok uyarıları) operasyon sorumlusuna gider. **Telegram yedek kanal ("emniyet subabı") olarak kalacak**: bildirim kanalları = program içi + web push + Telegram (yedek). WhatsApp kesinlikle yok (kullanıcı da istemiyor).
> - **KARAR (9 Kas, kullanıcı onayladı) — Mesajlaşma, kayda bağlı konuşma olarak:** Yukarıdan aşağı talimat zinciri değil, Slack benzeri karşılıklı mesaj trafiği; ama serbest kanal değil (ikinci WhatsApp grubu olmasın). (1) Her kaydın (alış/satış faturası, üretim partisi, sipariş, cari, görev) altında kendi konuşması; (2) kayda bağlı olmayan işler için başlıklı serbest konu (ör. başkanın misafir hazırlığı talimatı); (3) görev = mesaja sorumlu + son tarih eklenmiş hali, durum (Görüldü/Yapılıyor/Bitti) konuşma içinden; (4) bildirim sadece konuşmaya katılanlara ve @ ile çağrılana — program içi + web push, Telegram yedek; (5) "Mesajlar" ekranı Slack gibi (solda konular, sağda yazışma, okunmamış kalın), kayıt sayfasındaki konuşmayla aynı; (6) mevcut "Notlar" bunun içine erir. Her yönde çalışır (depo sorumlusu da başkanı çağırabilir). **Sıra:** Satış → Üretim → Mesajlaşma+görev → Raporlar/Mikro aktarımı. Veri modeli: konuşma (kayit_tur, kayit_id) ile herhangi bir kayda bağlanır.
> - **Bildirim altyapısı kanaldan bağımsız kurulacak:** tek `bildirimler` kaydı + teslim kanalları (program içi, web push; ileride gerekirse WhatsApp). WhatsApp şimdilik yok (bkz. sohbet: resmî API maliyet/şablon/doğrulama yükü; resmî olmayan yollar hesap kapatma riski) — iPhone push yetersiz kalırsa yalnızca o kanal eklenir.
> - **Teslim yöntemi (kullanıcı kararı):** program modül modül tamamlanacak → tamamı bitince test sürümü kooperatife verilecek → geri bildirim → düzeltme → teslim. Kooperatif o zamana kadar kilit sayfasını görüyor, yani hatırlatıcı sorunu canlıda kimseyi etkilemiyor.
>
> **Güncelleme 5 (9 Kasım 2026) — MUHASEBECİ CEVAPLARI GELDİ:**
> - Maliyet sistemi **7/A** uygun. Kartlı satış **108**'de; POS komisyonu **780**'e (taslaktaki 653 yanlıştı). Şirket kredi kartı **300**'de alt hesap (taslaktaki 309 yanlıştı → 300.02).
> - Müşteri **120**, tedarikçi **320**. Stok: 150 ilk madde ve malzeme, 151 yarı mamuller (üretimde), 152 mamuller, 153 ticari mallar.
> - **Cari kodu = muhasebe kodu birebir** → ayrı cari kodu alanı tutulmayacak.
> - **Fire:** oran/eşik belirtilmesin, duruma göre muhasebeci karar veriyor → sistem fireyi otomatik 689'a ayırmaz, fire maliyette kalır. Ama fire raporu (normal = sistemin verisinden çıkardığı standart, sapma görünür) aynen kalır; kaçak tespiti programın asıl amacı.
> - Tasarım taslağı bu cevaplara göre güncellendi (127, 309, 653, 689 satırları çıkarıldı/değişti). **Hâlâ açık:** Mikro örnek Excel şablonu gelmedi; Mikro aktarımı en sona kalıyor.
>
> **Güncelleme 3 (7 Kasım 2026):** Eski muhasebe tabloları (`islemler`, `musteriler`) yedeklenip silinecek, yeni yapı sıfırdan (aynı repo). Tıklanabilir tasarım taslağı: `tasarim-taslagi/index.html` (logo: `tasarim-taslagi/logo.png`, renkler logodan). Program adı önerisi "Terazi" — kullanıcı onayı bekliyor. Taslak muhasebeciye gösterilmek üzere geçici yayınlanacak (paylaşılan içerikte arka plan/ortaklık bilgisi yok).
>
> **Üretim/fire tasarımı (öneri):**
> - **Parti (üretim emri):** tarih, ürün, sorumlu, başlangıç/bitiş saati, parti/lot no, son kullanma tarihi.
> - **Gerçek tüketim:** partiye verilen her hammadde **tartılarak** girilir (un, peynir, kıyma, yağ, bulgur…), ambalaj adet olarak.
> - **Gerçek çıktı:** paketlenen adet/koli + paket ağırlığı; ayrı satırda bozuk/atılan ürün (fire nedeniyle: yırtık hamur, şekil bozukluğu, donma hatası…).
> - **Reçete (standart):** başta bilinmiyor → ilk 2–4 haftanın gerçek verisinden "olması gereken" reçete çıkarılır, sonra her parti bu standarda göre sapma olarak raporlanır.
> - **Fire raporu üç katmanlı:** (1) tartım fireyi: verilen hammadde – reçeteye göre olması gereken; (2) üretim firesi: kayıtlı bozuk/atılan ürün; (3) **açıklanamayan fark:** stok sayımı – sistem stoğu (kaçak/kayıt hatası burada görünür).
> - **Zaman:** parti başı süre ve kg/saat verimi; **nakit:** parti maliyeti (hammadde ortalama maliyeti × tüketim) ve birim maliyet, satış fiyatıyla karşılaştırma.
> - **Soğuk depo:** mamul stok lot + son kullanma bazında; yaklaşan SKT için Telegram uyarısı.
> - **Esneklik (kullanıcı isteği):** hammadde listesi sabit kodlanmaz; kullanıcı ihtiyaç oldukça elle ekler (bugün ceviz, yarın fındık). Parti kaydında reçetede olmayan malzeme de eklenebilir; reçete zorunlu değil, sadece karşılaştırma için. Giriş ekranında yazarken mevcut kartlar önerilir, yoksa tek tıkla yeni kart açılır (aynı malzemenin "ceviz / Ceviz içi / ceviz ici" diye üç ayrı kayıt olmasını önlemek için; gerekirse iki kartı birleştirme özelliği).
> - **Kritik bağımlılık:** tesiste partiye çıkan hammaddenin tartılıp girilmesi. Bu yapılmazsa sistem fireyi bulamaz — kurulumdan önce tesis sorumlusuyla nasıl girileceği (tablet/telefon, Telegram'dan sesli/yazılı) konuşulmalı.

## Bağlam
Büyük bir şirket kooperatife ortak oldu. Kendi muhasebe programları var; kooperatif için ayrı bir muhasebe programı kurmak yerine, kooperatifin **stok, üretim, alacak/borç (müşteri + tedarikçi) ve iş akışını** takip eden, sonunda **Türkiye Tek Düzen Hesap Planı (TDHP) kodlarıyla** rapor çıkarıp onların programına **veri aktarılabilen** bir sistem istiyorlar.

## Kodu okuyarak tespit ettiklerim (önce bunlar)
1. **Yanlış klasördeyiz.** Bu oturum `suluova-kooperatif` (sosyal medya otomasyonu) içinde açık. Ön muhasebe programı `kooperatif-asistani` klasöründe (Next.js + Supabase, canlıda). İş orada yapılacak.
2. **"Stok" modülü şu an yok.** `kooperatif-asistani` içinde `stok` kelimesi hiç geçmiyor. Mevcut olanlar: tek taraflı gelir/gider (`islemler` tablosu: tür + tutar + serbest metin `kategori`), müşteri kartı (`musteriler`, işleme opsiyonel bağlanıyor), hatırlatıcı, not, OCR'la fiş okuma, Telegram asistanı, dönemsel rapor.
3. **Mevcut yapı muhasebe mantığına uymuyor.** `islemler` "gelir/gider" diye tutuluyor; muhasebede her kayıt **borç = alacak** dengesiyle (çift taraflı) yapılır ve her satırın bir hesap kodu olur (100 Kasa, 120 Alıcılar, 320 Satıcılar, 153 Ticari Mallar, 600 Satışlar…). Bu yüzden bu iş "birkaç özellik eklemek" değil, **veri modelinin çekirdeğini değiştirmek** demek. Mevcut kayıtlar taşınabilir ama serbest metin kategoriler tek tek hesap koduna eşlenmeli.
4. **Commit edilmemiş iş var:** `src/proxy.ts`'te "hizmet durduruldu" kilidi (`HIZMET_DURDURULDU` env var'ı) ve iki yeni html dosyası. Başlamadan önce bunun durumunu konuşmamız lazım (ödeme gecikmesi meselesi hâlâ aktif mi?).

## Temel öneri (dürüst değerlendirme)
**Tam bir muhasebe programı yazmayalım.** Yasal defterleri (yevmiye, kebir, envanter), beyannameleri, e-fatura/e-arşivi ortak şirketin programı ve mali müşaviri zaten tutuyor; onu kopyalamak hem gereksiz hem riskli (yanlış bir vergi hesabının sorumluluğu bize kalır).

Bizim sistemimiz **"operasyon + ön kayıt" katmanı** olsun:
- Kooperatif çalışanı muhasebe bilmeden işini girer: "şu tedarikçiden 500 kg ceviz aldım", "şu siparişi ürettim", "şu müşteriye sattım", "şu tahsilatı aldım".
- Sistem arka planda bunu **TDHP kodlu yevmiye fişine** çevirir (borç/alacak satırları).
- Ay sonunda bu fişler **ortak şirketin programının içe aktarma formatında** dışa verilir; muhasebeci kontrol edip kendi programına alır.

Bu yaklaşımın tek kritik bağımlılığı: **ortak şirket hangi programı kullanıyor ve hangi dosya formatını içe alıyor?** (Logo, Mikro, Netsis, Luca, ETA, Zirve vb. — her birinin Excel/XML aktarım şablonu farklı.) Bu öğrenilmeden aktarım modülü tasarlanmamalı; aynı ders eski planda da vardı ("muhasebeci formatı gelmeden rapor modülü tasarlanmayacak").

## Aksiyon Planı

### Faz 0 — Bilgi toplama (kod yok, ~1 hafta)
Senin notların + şu konuşmalar. En önemlisi ortak şirketin muhasebecisiyle 30 dakikalık bir görüşme.
- [ ] Senin notlarını al, bu planla karşılaştır.
- [ ] **Ortak şirketin muhasebe programı ve içe aktarma şablonu** (örnek bir dosya iste).
- [ ] Kullanmamızı istedikleri **hesap planı**: düz TDHP mi, yoksa kendi alt hesap yapıları var mı (ör. `120.01.001` müşteri bazında, `153.01` ürün grubu bazında)?
- [ ] Ne sıklıkla, hangi detayda veri istiyorlar: her fatura tek tek mi, aylık özet fiş mi?
- [ ] Kooperatifin vergi durumu: KDV mükellefi mi, e-fatura mükellefi mi, faturaları kim kesiyor? (KDV'nin 191/391 hesaplarına nasıl yazılacağını belirler.)
- [ ] Üretim süreci: hangi ürünler, hangi hammaddeden, fire/maliyet nasıl hesaplanıyor? (Reçete yapısını belirler.)
- [ ] İş akışı: sipariş → üretim → sevkiyat → fatura → tahsilat zincirinde kim neyi onaylıyor?
- [ ] Hizmet durdurma kilidi / ödeme durumu netleşsin, bekleyen commit kararı verilsin.

**Çıktı:** Bu plan, cevaplara göre güncellenmiş kesin kapsam + `kooperatif-asistani/CLAUDE.md`'ye eklenecek proje kararları.

### Faz 1 — Muhasebe çekirdeği (temel taş)
- **Hesap planı tablosu:** TDHP ana hesapları hazır yüklenir; alt hesaplar (müşteri/tedarikçi/ürün bazında) sistem tarafından otomatik açılır.
- **Yevmiye fişi + satırları:** her fişte borç toplamı = alacak toplamı kuralı **veritabanı seviyesinde** zorunlu (arayüzde değil — hatalı veri hiç girmesin).
- **Kayıt silinmez, ters kayıtla düzeltilir;** ay kapatıldıktan sonra o dönem kilitlenir. Kim neyi ne zaman değiştirdi kaydı (audit log) baştan.
- **Cari kartlar:** mevcut `musteriler` tablosu genişletilir → müşteri **ve** tedarikçi; vergi no, vergi dairesi, IBAN, vade gün sayısı.
- Mevcut `islemler` kayıtlarının kategori → hesap kodu eşlemesi ve taşınması (eski veri kaybolmaz).

### Faz 2 — Stok
- Ürün/malzeme kartları (hammadde, ambalaj, mamul, ticari mal; birim: kg/adet/koli).
- Stok hareketleri (giriş/çıkış/sayım farkı/fire); anlık stok miktarı ve değeri.
- Minimum stok uyarısı → mevcut Telegram altyapısıyla bildirim.

### Faz 3 — Alış / Satış / Tahsilat / Ödeme
- Alış faturası: stok girişi + tedarikçiye borç (320) + İndirilecek KDV (191) — tek girişle üçü birden.
- Satış faturası: stok çıkışı + müşteriden alacak (120) + Satış (600) + Hesaplanan KDV (391).
- Tahsilat/ödeme (kasa 100 / banka 102), vade takibi, gecikenler için hatırlatıcı.
- OCR'la fatura okuma mevcut — alış faturasına bağlanır.

### Faz 4 — Üretim
- Reçete: "1 kg ürün = x kg hammadde + y ambalaj".
- Üretim kaydı: hammadde stoktan düşer, mamul stoka girer, maliyet hesaplanır (fire dahil).
- Muhasebe karşılığı (150 → 710/720/730 → 151/152) Faz 0'da muhasebeciyle netleşen yönteme göre.

### Faz 5 — İş akışı takibi
- Sipariş kartı ve durumları: alındı → üretimde → hazır → sevk edildi → faturalandı → tahsil edildi.
- Sorumlu kişi atama, gecikme uyarıları (Telegram), dashboard'da "bekleyen işler" panosu.

### Faz 6 — Raporlar ve aktarım
- **Mizan** (hesap kodu bazında borç/alacak/bakiye), **cari ekstre**, alacak yaşlandırma, stok durum ve hareket raporu, üretim/maliyet raporu, KDV özeti.
- **Ortak şirketin programına aktarım dosyası** (Faz 0'da alınan şablon birebir); Excel ve PDF çıktı.
- İlk ay: aktarım dosyası muhasebeciye verilip kendi programına test olarak yüklenir; eşleşmeyen her satır düzeltilene kadar "bitti" denmez.

### Sıralama mantığı
Faz 1 olmadan hiçbir şey doğru rapor üretemez → ilk o. Ama **her fazın sonunda kooperatifin gerçekten kullanabileceği bir parça** canlıya çıkar (önce Faz 1+2+3 birlikte ilk anlamlı paket; üretim ve iş akışı sonra). Faz 6'nın aktarım kısmı, şablon geldiyse Faz 3 ile paralel başlayabilir.

## Teknik kurallar (uygulama sırasında)
- Aynı kod tabanı: `kooperatif-asistani` (yeni proje açılmaz). Her şey Supabase migration dosyalarıyla (`supabase/migrations/`), mevcut stile uygun.
- Modüllere ayrılmış dosyalar (`src/app/(uygulama)/stok`, `.../cari`, `.../uretim`, `src/app/actions/stok.ts` …) — tek dosyaya yığılmaz.
- Para alanları `numeric`, kuruş hassasiyetinde; KDV oranları tabloda (sabit kodlanmaz).
- RLS kuralları mevcut roller (`baskan`, `on_muhasebe`, `izleyici`) üzerine; gerekirse "ortak şirket muhasebecisi" için sadece rapor okuyan yeni rol.
- `kooperatif-asistani/AGENTS.md` uyarısı: bu Next.js sürümü farklı — kod yazmadan önce `node_modules/next/dist/docs/` okunacak.
- Canlıda gerçek veri var: yapı değişiklikleri önce test ortamında/yerel Supabase'de denenir, üretim verisi yedeklenir.

## Doğrulama
- Her yevmiye fişi için borç = alacak (veritabanı kuralı + test).
- Örnek bir ay için elle hesaplanmış mizan ile sistemin mizanı birebir tutmalı.
- Stok: sayım sonucu ile sistem stoku karşılaştırması.
- Aktarım: dosya ortak şirketin programına hatasız yüklenmeli (asıl kabul testi bu).
- Canlıya almadan önce `/guvenlik-taramasi`.

## Senden beklediğim (bir sonraki adım)
1. Notların.
2. Ortak şirketin kullandığı muhasebe programının adı ve mümkünse örnek içe aktarma dosyası.
3. `proxy.ts`'teki "hizmet durduruldu" değişikliği ne olacak (commit mi, beklesin mi)?
4. Oturumu `kooperatif-asistani` klasöründe açman (orada çalışacağız).
