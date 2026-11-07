# Kooperatif Asistanı → Stok + Üretim + Cari + Muhasebe Kodlu Takip Sistemi — Aksiyon Planı

> **Durum (7 Kasım 2026):** Plan onaylandı, Faz 0 (bilgi toplama) aşamasındayız — henüz kod yazılmadı. Kullanıcının notları ve ortak şirketin muhasebe programı/aktarım şablonu bekleniyor. Bu plan `suluova-kooperatif` klasöründe yanlışlıkla açılan oturumda hazırlandı; "Yanlış klasördeyiz" maddesi artık geçersiz.
>
> **Güncelleme (7 Kasım 2026, kooperatif-asistani oturumu):**
> - Ortak şirketin programı: **Mikro**. (Hangi ürün/sürüm — Jump, Fly, Run — ve kooperatif orada ayrı firma mı, henüz bilinmiyor.)
> - **Hizmet devam ediyor** — kooperatif darboğazdan çıktı, ödeme kilidi kullanılmayacak. `proxy.ts`'teki kilidin commit edilip edilmeyeceği (env var'la kapalı anahtar olarak) hâlâ karar bekliyor.
> - Kullanıcının akış fikri (yarım kaldı): giriş → tedarikçiler → stok → tahsilat → üretim (üretimin neyle/nasıl yapıldığı anlatılacak).
> - **Kritik açık soru (muhasebeciye):** Mikro'ya sadece yevmiye fişi mi aktaracağız, yoksa fatura + cari hareket + stok hareketi mi? Mikro stok/cari/muhasebeyi tek programda tutar; sadece yevmiye fişi gönderilirse Mikro'daki stok ve cari modülleri boş kalır. Fatura/hareket aktarılırsa yevmiyeyi Mikro kendi üretir ve bizdeki çift taraflı muhasebe motoru (Faz 1) çok sadeleşebilir. Cevap Faz 1'in kapsamını belirler.
> - E-faturayı kim kesiyor (Mikro'dan mı)? Satış faturası Mikro'da doğuyorsa veri yönü tersine döner (Mikro → biz).

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
