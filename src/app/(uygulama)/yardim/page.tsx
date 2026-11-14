import Link from "next/link";
import { YazdirDugmesi } from "@/components/YazdirDugmesi";
import { mevcutRol, yoneticiMi } from "@/lib/rol";
import { TEKNIK_DESTEK } from "@/lib/imza";
import { ROLLER, maasGorurMu } from "@/lib/roller";

type Bolum = { baslik: string; alt: string; icerik: React.ReactNode };

const B = ({ children }: { children: React.ReactNode }) => <b className="yardim-dugme">{children}</b>;

const T = ({ yol }: { yol: string }) => <span className="yardim-telefon">📱 Telefonda: {yol}</span>;

const BOLUMLER: Bolum[] = [
  {
    baslik: "Satış yaptım",
    alt: "Müşteriye ürün verildi (peşin ya da veresiye)",
    icerik: (
      <ol>
        <li>
          Menüden <B>Satış</B> → <B>+ Yeni satış</B>. <T yol="＋ → Satış" />
        </li>
        <li>
          <b>Müşteri</b>yi seçin. Listede yoksa önce müşteriyi açın (aşağıda &quot;Yeni müşteri / tedarikçi&quot;).
        </li>
        <li>
          Ürün adını yazmaya başlayın, listeden seçin. <b>Miktar</b> ve <b>Birim fiyat (KDV hariç)</b> girin. KDV oranı
          üründen gelir.
        </li>
        <li>
          Birden fazla ürün varsa <B>+ Ürün ekle</B>.
        </li>
        <li>
          <b>Ödeme</b>: para hemen alındıysa kasayı / bankayı / POS&apos;u seçin; sonra ödeyecekse <B>Veresiye</B> kalsın.
        </li>
        <li>
          <B>Kaydet</B>.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Müşteriden para geldi",
    alt: "Veresiye satışın parası sonradan ödendi",
    icerik: (
      <ol>
        <li>
          Menüden <B>Kasa ve Banka</B> → <B>+ Tahsilat</B>. <T yol="＋ → Tahsilat" />
        </li>
        <li>
          <b>Para nereye girdi?</b> (kasa, banka, POS) · <b>Kimden?</b> (müşteri) · <b>Tutar</b>.
        </li>
        <li>
          Dekont / makbuz numarası varsa <b>Belge no</b>ya yazın. <B>Kaydet</B>.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Mal / malzeme aldım, fatura geldi",
    alt: "Tedarikçiden alış (un, ambalaj…) ya da gider (elektrik, kira…)",
    icerik: (
      <ol>
        <li>
          Menüden <B>Alış</B> → <B>+ Yeni alış</B>. <T yol="＋ → Alış" />
        </li>
        <li>
          <b>Tedarikçi</b>yi seçin, <b>Fatura no</b> yazın (zorunlu), fatura tarihini kontrol edin.
        </li>
        <li>
          Depoya giren her şey için <B>Malzeme / ürün</B>: adını listeden seçin, miktar ve birim fiyat (KDV hariç) girin.
        </li>
        <li>
          Depoya girmeyen masraflar (elektrik, kira, tamir, demirbaş) için <B>+ Gider ekle</B> → <b>Gider hesabı</b>nı seçin.
        </li>
        <li>
          <b>Ödeme şekli</b>: hemen ödendiyse hesabı seçin, sonra ödenecekse <B>Veresiye</B>. <B>Kaydet</B>.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Tedarikçiye ödeme yaptım",
    alt: "Veresiye alınan malın parası ödendi",
    icerik: (
      <ol>
        <li>
          <B>Kasa ve Banka</B> → <B>Ödeme</B>. <T yol="＋ → Ödeme" />
        </li>
        <li>
          <b>Para nereden çıktı?</b> · <b>Kime?</b> (tedarikçi) · <b>Tutar</b> · <B>Kaydet</B>.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Hesaplar arası para geçti",
    alt: "POS parası bankaya geçti, kasadan bankaya yatırıldı, kredi kartı borcu ödendi",
    icerik: (
      <ol>
        <li>
          <B>Kasa ve Banka</B> → <B>Virman</B>. <T yol="＋ → Virman" />
        </li>
        <li>
          <b>Kaynak hesap</b> (paranın çıktığı) · <b>Hedef hesap</b> (girdiği) · <b>Tutar</b>.
        </li>
        <li>
          POS&apos;tan bankaya geçerken banka komisyon kestiyse <b>Komisyon (₺)</b> alanına yazın. <B>Kaydet</B>.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Üretim yaptık",
    alt: "Bir parti (ör. su böreği) hazırlandı — telefondan da girilebilir",
    icerik: (
      <ol>
        <li>
          Menüden <B>Üretim</B> → <b>Ne üretilecek?</b> seçin → <B>▶ Partiyi başlat</B>. <T yol="＋ → Üretim" />
        </li>
        <li>
          Kullanılan her malzemeyi tartıp yazın: <b>Malzeme</b> + <b>Tartılan</b> → <B>+ Ekle</B>. Yanlış girdiyseniz satırdaki{" "}
          <B>Sil</B>.
        </li>
        <li>
          İş bitince: <b>Paketlenen</b> miktar, varsa <b>Bozuk / atılan</b> miktar ve nedeni, <b>Son kullanma tarihi</b> →{" "}
          <B>■ Partiyi bitir</B>.
        </li>
        <li>Parti bitirilmeden ürün stoğa girmez. Gün sonunda açık parti bırakmayın.</li>
      </ol>
    ),
  },
  {
    baslik: "Müşteri malı geri getirdi / tedarikçiye mal geri verdim",
    alt: "İade",
    icerik: (
      <ol>
        <li>
          İadenin ait olduğu faturayı açın (<B>Satış</B> ya da <B>Alış</B> listesinden).
        </li>
        <li>
          <B>↩ Müşteriden iade al</B> ya da <B>↩ Tedarikçiye iade et</B>.
        </li>
        <li>
          Geri gelen miktarı yazın. Müşteri iadesinde: ürün satılabilir durumdaysa <B>Sağlam · stoğa al</B>, değilse{" "}
          <B>Bozuk · imha</B>.
        </li>
        <li>
          Para geri verildiyse hesabı seçin; verilmediyse <B>Yok · borcundan düş</B>. <B>İadeyi kaydet</B>.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Yeni müşteri / tedarikçi, yeni ürün / malzeme",
    alt: "Listede olmayan bir kişi, firma ya da kalem",
    icerik: (
      <>
        <p>
          <b>Müşteri / tedarikçi:</b> <B>Cariler</B> → üstten <B>Müşteriler</B> ya da <B>Tedarikçiler</B> →{" "}
          <B>+ Yeni müşteri</B> / <B>+ Yeni tedarikçi</B>. Ünvan yeterli; müşteriye genelde kaç gün vade verildiyse{" "}
          <b>Vade (gün)</b> alanına yazın.
        </p>
        <p>
          <b>Ürün / malzeme:</b> <B>Stok</B> → <B>+ Yeni stok kartı</B>. <b>Tür</b> önemli: un, peynir = Hammadde; kutu,
          poşet = Ambalaj; kendi ürettiğimiz = Ürün (mamul); alıp aynen sattığımız = Ticari mal. <B>Kartı aç</B>.
        </p>
        <p className="soluk">Aynı şeyi iki kez açmamak için önce listede arayın.</p>
      </>
    ),
  },
  {
    baslik: "Depo sayımı",
    alt: "Ay sonunda ya da şüphe olunca",
    icerik: (
      <ol>
        <li>
          <B>Stok</B> → <B>Sayım yap</B>. <T yol="＋ → Sayım" />
        </li>
        <li>
          Rafta gerçekten olan miktarı <b>Sayılan</b> sütununa yazın (<b>Sistemde</b> sütunu programın beklediği miktardır).
        </li>
        <li>
          <B>Sayımı kaydet</B>. Fark, fire/kaçak raporunda görünür.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Yanlış girdim — iptal",
    alt: "Kayıt silinmez, ters kayıtla iptal edilir",
    icerik: (
      <>
        <ol>
          <li>Yanlış kaydı açın (satış, alış, parti, kasa hareketi…).</li>
          <li>
            <B>İptal et</B> → nedenini yazın → onaylayın. Sonra doğrusunu yeniden girin.
          </li>
        </ol>
        <p className="not">
          Kendi girdiğiniz kaydı <b>aynı gün</b> iptal edebilirsiniz. Daha eski kayıtlar ve başkasının kayıtları için kooperatif yönetimine (Başkan ya da Operasyon yöneticisi)
          söyleyin. İadesi olan bir fatura iptal edilemez; önce iade iptal edilir.
        </p>
      </>
    ),
  },
  {
    baslik: "Telegram'dan",
    alt: "Kooperatifin Telegram botu",
    icerik: (
      <ul>
        <li>
          <b>&quot;özet&quot;</b> yazın: genel durum ve yaklaşan hatırlatıcılar gelir.
        </li>
        <li>
          Yazarak ya da sesli mesajla hatırlatıcı kurun: <i>&quot;15 Aralık&apos;ta SGK ödemesini hatırlat&quot;</i>. Hatırlatma
          size gelir.
        </li>
        <li>
          Not bırakın ve kime gideceğini söyleyin: <i>&quot;yarın sayım var, depocu arkadaşlar erken gelsin&quot;</i> ya da{" "}
          <i>&quot;Fatih Bey&apos;e not: ...&quot;</i>. Bot kime gittiğini size yazar; not <b>Notlar</b> sayfasında da görünür.
        </li>
        <li>
          <b>Fotoğraf, video ya da dosya</b> da gönderebilirsiniz (en fazla 20 MB). Açıklamasına kime gideceğini yazarsanız o
          kişilere iletilir; hepsi <b>Notlar</b> sayfasına kaydolur. Telegram&apos;dan fatura ya da fiş kaydı yapılmaz; onlar web
          panelinden girilir.
        </li>
        <li>Bot sizi tanımıyorsa size bir numara söyler; o numarayı teknik desteğe iletin.</li>
      </ul>
    ),
  },
  {
    baslik: "İskontolu satış ya da alış",
    alt: "Müşteriye ya da tedarikçiden gelen indirim",
    icerik: (
      <>
        <ol>
          <li>
            Satış (ya da Alış) formunda ürün satırındaki <b>İskonto %</b> alanına yüzdeyi yazın; yalnızca o satır indirilir.
          </li>
          <li>
            Faturanın tamamına indirim varsa <b>Genel iskonto %</b> alanına yazın; satır iskontosundan sonra uygulanır.
          </li>
          <li>Formun altında brüt tutar ve iskonto görünür; KDV indirimli tutar üzerinden hesaplanır.</li>
        </ol>
        <p className="not">
          İndirimli fiyatı fiyat alanına yazmayın; yüzdeyi iskonto alanına yazın ki program iskontoyu ayrı izleyebilsin. Alışta iskonto ürünün maliyetini düşürür.
          Telefonda bu alanlar <B>Daha fazla</B> altındadır.
        </p>
      </>
    ),
  },
  {
    baslik: "Ana Panel'i okumak",
    alt: "Güne başlarken bir bakın",
    icerik: (
      <ul>
        <li>
          <b>Nakit:</b> kasa, banka ve POS&apos;taki paranın toplamı.
        </li>
        <li>
          <b>Alacak (müşterilerden):</b> müşterilerin bize toplam borcu; altında vadesi geçmiş kısmı yazar.
        </li>
        <li>
          <b>Borç:</b> tedarikçilere ve şirket kredi kartına olan borç.
        </li>
        <li>
          <b>Bu ay net satış (KDV hariç):</b> iadeler düşülmüş satış; geçen ayın aynı gününe göre artış ya da azalış gösterilir.
        </li>
        <li>
          <b>Bu ay üretim:</b> parti sayısı ve ortalama fire.
        </li>
        <li>
          <b>Dikkat edilecekler:</b> vadesi geçen alacaklar, son kullanma tarihi 30 gün içinde dolacak ürünler, eksiye düşen stok, dünden kalan açık parti ve
          vadesi yaklaşan çek/senetler. Bu kutu boşsa acil bir şey yok demektir.
        </li>
        <li>
          Altta <b>Yaklaşan hatırlatıcılar</b> var. Kuruluş bitene kadar <b>Kurulum adımları</b> kutusu da görünür.
        </li>
        <li>Depo görevlisi para kartlarını görmez.</li>
      </ul>
    ),
  },
  {
    baslik: "Raporlar ve Excel'e aktarma",
    alt: "Muhasebe → Raporlar",
    icerik: (
      <>
        <ol>
          <li>
            Üstteki sekmelerden raporu seçin: <b>Satış ve kârlılık</b> (ürün ve müşteri bazında ciro, maliyet, kâr), <b>Fire ve kaçak</b> (üretim firesi, sayım
            farkları), <b>Alacak yaşlandırma</b> (kim ne kadar borçlu, ne kadar gecikmiş), <b>Mizan</b> (hesap kodlu borç/alacak/bakiye), <b>KDV özeti</b>.
          </li>
          <li>
            Aylık raporlarda sağ üstten ayı seçip <B>Göster</B>&apos;e basın. Alacak yaşlandırma her zaman bugünkü durumu gösterir.
          </li>
          <li>
            <B>Excel indir</B> ile raporu dosya olarak alın; her bölüm ayrı sayfa olur. Mali müşavire ya da arşive göndermek için kullanılır.
          </li>
        </ol>
        <p className="not">
          KDV özeti beyanname değildir, kontrol içindir. Raporları depo görevlisi göremez; muhasebeci ve izleyici görür, indirir.
        </p>
      </>
    ),
  },
  {
    baslik: "Çek / senet",
    alt: "Kooperatif kullanırsa — Finans → Çek / Senet",
    icerik: (
      <ol>
        <li>
          Sayfanın üstündeki formda <B>Müşteriden aldık</B> ya da <B>Tedarikçiye verdik</B>, sonra <B>Çek</B> ya da <B>Senet</B> seçin; cari, <b>Tutar</b>, <b>Vade</b> ve
          tarihi yazıp <B>Kaydet</B> deyin.
        </li>
        <li>
          Sekmeler: <b>Portföy (alınan)</b>, <b>Ödenecek (verilen)</b>, <b>Kapananlar</b>.
        </li>
        <li>
          Evrakı açıp işlem yapın: <B>Tahsil et</B> (paranın girdiği hesabı seçin), <B>Tedarikçiye ciro et</B>, <B>Karşılıksız / protestolu</B>, verilen evrak için{" "}
          <B>Ödendi olarak işle</B>.
        </li>
        <li>
          Yanlış işlem yaptıysanız yalnızca <b>son işlem</b> <B>Bu işlemi geri al</B> ile geri alınır.
        </li>
        <li>Vadesi 7 gün içinde gelen ya da geçen evraklar Ana Panel&apos;de uyarı olarak çıkar.</li>
      </ol>
    ),
  },
  {
    baslik: "Hatırlatıcılar ve notlar",
    alt: "Genel → Hatırlatıcılar / Notlar",
    icerik: (
      <ul>
        <li>
          <b>Hatırlatıcı:</b> <b>Yeni Hatırlatıcı</b> kutusuna başlığı ve tarihi yazın, <b>Kime</b> alanından <b>Herkes</b>, bir iş grubu (ör. Depo / üretim) ya da tek tek kişileri seçin; birden fazlası seçilebilir (boş bırakırsanız size gelir), <B>Ekle</B>.
          Günü gelince kişiye Telegram&apos;dan haber gider.
        </li>
        <li>İşi yaptıysanız hatırlatıcıdaki kutuyu işaretleyin; işaretlenmeyen hatırlatma tekrar gönderilebilir.</li>
        <li>
          <b>Notlar:</b> &quot;Bir not bırak…&quot; kutusuna yazın, isterseniz <b>Kime</b> alanından kişi, iş grubu ya da Herkes seçin (seçilenlere Telegram bildirimi gider; kişi seçtiğiniz not yalnız size ve seçtiklerinize görünür, kimseyi seçmezseniz genel not olur ve herkes görür), sonra <B>Not Ekle</B>&apos;ye basın ya da Telegram&apos;dan yazın.
        </li>
      </ul>
    ),
  },
];

const YONETICI_BOLUMLERI: Bolum[] = [
  {
    baslik: "Yeni kişi ekleme ve roller",
    alt: "Ayarlar → Kişiler ve yetkiler",
    icerik: (
      <>
        <ol>
          <li>
            Bilgisayarda soldaki menünün altından, telefonda <B>Menü</B>&apos;den <B>Ayarlar</B>&apos;a girin; <b>Kişiler ve yetkiler</b> bölümünde <b>Yeni kişi ekle</b>&apos;yi
            bulun.
          </li>
          <li>
            <b>Ad soyad</b>, <b>E-posta (giriş adı)</b>, <b>Geçici şifre</b> (en az 6 karakter), <b>Rol</b> ve <b>Görev</b>&apos;i yazıp <B>Kişiyi ekle</B> deyin.
          </li>
          <li>Geçici şifreyi kişiye siz iletirsiniz; ilk girişte Hesabım&apos;dan değiştirmesini söyleyin.</li>
          <li>
            Telegram bildirimi için: kişi Telegram&apos;da kooperatif botuna bir mesaj yazar, bot ona numarasını söyler; siz kişinin satırındaki <b>Telegram numarası</b>{" "}
            alanına yazıp kaydedin.
          </li>
        </ol>
        <p>
          <b>Roller:</b>
        </p>
        <ul>
          {ROLLER.filter((r) => r.deger !== "destek").map((r) => (
            <li key={r.deger}>
              <b>{r.ad}:</b> {r.aciklama}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    baslik: "Şifresini unutan biri",
    alt: "Ayarlar → Kişiler ve yetkiler → Şifreyi sıfırla",
    icerik: (
      <>
        <ol>
          <li>
            <b>Kişiler ve yetkiler</b> listesinde kişinin satırındaki <B>Şifreyi sıfırla</B> düğmesine basın.
          </li>
          <li>
            Açılan alana kişiye ileteceğiniz <b>yeni geçici şifreyi</b> yazın (en az 6 karakter) ve <B>Şifreyi sıfırla</B>&apos;ya basın.
          </li>
          <li>Şifreyi kişiye siz iletin; girişten sonra <b>Hesabım</b> sayfasından kendi şifresini koymasını söyleyin.</li>
        </ol>
        <p className="not">
          Her sıfırlama <b>İşlem Geçmişi</b>&apos;ne &quot;Şifre sıfırlama&quot; olarak yazılır; şifrenin kendisi hiçbir yere kaydedilmez. Kural: Başkanın şifresini Başkan ya da teknik destek, teknik desteğin şifresini yalnızca teknik destek sıfırlar.
          Kendi şifrenizi Hesabım&apos;dan değiştirin.
        </p>
      </>
    ),
  },
  {
    baslik: "İşlem geçmişi: kim ne yaptı?",
    alt: "Muhasebe → İşlem Geçmişi",
    icerik: (
      <p>
        Programda kimin, ne zaman, hangi kaydı eklediğini, değiştirdiğini ya da iptal ettiğini gösterir. <b>Kişi</b>, <b>Kayıt türü</b> ve tarih aralığıyla
        süzebilirsiniz; değişen alanlarda eski ve yeni değer yan yana görünür. Kullanıcı ekleme/silme, rol-görev-Telegram değişikliği, şifre sıfırlama ve Ayarlar değişiklikleri de burada görünür; teknik destek hesabıyla yapılanlar kişisel ad yerine &quot;Teknik destek&quot; olarak yazılır (şifre ve anahtarların kendisi yazılmaz). Liste değiştirilemez. Başkan, Operasyon yöneticisi, teknik destek ve muhasebeci görür.
      </p>
    ),
  },
];

// Yalnız maaş yetkilisi görür (Başkan, Operasyon yöneticisi, ön muhasebe, bilgi işlem) — veritabanındaki maas_gorur() ile aynı.
const MAAS_BOLUMLERI: Bolum[] = [
  {
    baslik: "Yeni personel başladı",
    alt: "Finans → Personel ve Puantaj → Yeni personel",
    icerik: (
      <>
        <ol>
          <li>
            Menüden <B>Personel ve Puantaj</B>&apos;a girin. Üstteki <b>Yeni personel</b> kutusuna <b>ad soyad</b> yazın.
          </li>
          <li>
            <b>Durum</b>: işe başladıysa <b>Çalışıyor</b>; evrakı henüz teslim edilmediyse <b>Girişi bekliyor</b>.
          </li>
          <li>
            <b>İşe başlama</b> tarihini, <b>Ücret tipi</b>ni (günlük ya da saatlik) ve <b>Ücret</b>i girin. Yol parası alıyorsa{" "}
            <b>Günlük yol parası</b>nı yazın, almıyorsa boş bırakın.
          </li>
          <li>
            <B>Personeli ekle</B>.
          </li>
        </ol>
        <p className="not">
          Ücret ve yol parası işe başlama tarihinden geçerli olur. Evrak gelince kişinin kartından durumu <b>Çalışıyor</b> yapın.
        </p>
      </>
    ),
  },
  {
    baslik: "Ücret değişti (zam, deneme süresi, saatliden günlüğe)",
    alt: "Personel → kişinin adı → Ücret geçmişi",
    icerik: (
      <>
        <ol>
          <li>Listede kişinin adına tıklayın.</li>
          <li>
            <b>Ücret geçmişi</b> bölümünde yeni ücretin <b>geçerli olduğu tarihi</b>, tipini ve tutarını yazın; açıklamaya
            &quot;Zam&quot; gibi bir not düşün. <B>Yeni ücreti ekle</B>.
          </li>
        </ol>
        <p className="not">
          Eski ücreti düzeltmeyin, yenisini ekleyin: o tarihten önceki günler eski ücretle, sonrakiler yeni ücretle hesaplanır. Deneme
          süresinde yarım ücret de böyle girilir: başlangıç tarihiyle yarım ücret, tam ücrete geçtiği tarihle tam ücret.
        </p>
      </>
    ),
  },
  {
    baslik: "Yol parası, sigorta parası",
    alt: "Personel → kişinin adı → Ek ödemeler",
    icerik: (
      <>
        <ol>
          <li>
            Kişinin kartında <b>Ek ödemeler</b> bölümünde ödemenin adını seçin ya da yazın (Yol parası, Sigorta parası…).
          </li>
          <li>
            <b>Nasıl</b>: <b>Geldiği her gün</b> (puantajda çalıştığı her gün için bir kez eklenir; fazla mesaili gün de bir sayılır)
            ya da <b>Ayda bir</b>.
          </li>
          <li>
            Tutarı ve başlangıç tarihini girip <B>Ek ödemeyi ekle</B>.
          </li>
        </ol>
        <p className="not">Ödeme kalkarsa silmeyin; satırdaki tarih kutusuna bitiş tarihini girip <b>Bitir</b>&apos;e basın.</p>
      </>
    ),
  },
  {
    baslik: "Puantaj girişi",
    alt: "Personel ve Puantaj → Puantaj gir",
    icerik: (
      <>
        <ol>
          <li>
            <B>Puantaj gir</B>&apos;e basın, üstten kişiyi seçin. Ayı ‹ › düğmeleriyle değiştirirsiniz.
          </li>
          <li>
            Her güne <b>çalıştığı gün sayısını</b> yazın: tam gün 1, yarım gün 0,5, fazla mesaili gün 2. Saatlik ücretlide gün yerine{" "}
            <b>saat</b> yazılır.
          </li>
          <li>
            Gelmediği güne 0 yazıp <b>Gün türü</b>nü seçin: Eksik gün, İzinli, Raporlu, Resmi tatil, Hafta tatili.
          </li>
          <li>
            Kolaylık: <B>Doldur</B> düğmesi boş günlere 1 yazar, pazarları hafta tatili yapar. Sonra yalnız farklı günleri düzeltin.
          </li>
          <li>
            Bir günün tutarı farklıysa <b>Elle tutar</b>a yazın; hesap o günü bu tutarla alır. Nedenini açıklamaya yazın.
          </li>
          <li>
            <B>Kaydet</B>. Kaydedilmemiş günler renkli görünür; sayfadan çıkmadan kaydedin.
          </li>
        </ol>
        <p className="not">
          Resmi tatil ücretliyse o güne 1, ücretsizse 0 yazın; türü yine &quot;Resmi tatil&quot; seçin. Tutar gün sayısından, tür ise
          mali müşavir özetindeki sayımdan gelir. Puantajı gün gün de girebilirsiniz, ay sonunda topluca da.
        </p>
      </>
    ),
  },
  {
    baslik: "Ay sonu: avans, kesinti, ödendi",
    alt: "Personel ve Puantaj → Aylık özet",
    icerik: (
      <ol>
        <li>
          <B>Aylık özet</B>&apos;te her kişinin geldiği gün, hak edişi, ek ödemeleri ve toplamı görünür.
        </li>
        <li>
          Avans ya da kesinti varsa kişinin satırında <B>Düzelt / ödendi</B>: tutarı eksi olarak yazın (örn. -500) ve açıklamasını
          girin (örn. Avans). Açıklamasız düzeltme kaydedilmez.
        </li>
        <li>
          Ödeme yapılınca aynı yerden <b>Ödendiği tarih</b>i girin.
        </li>
      </ol>
    ),
  },
  {
    baslik: "Mali müşavire puantaj özeti",
    alt: "Aylık özet → Mali müşavir puantaj özeti (Excel)",
    icerik: (
      <>
        <p>
          <B>Mali müşavir puantaj özeti (Excel)</B> her kişinin çalıştığı gün, fazla gün, eksik gün, izin, rapor, resmi tatil ve hafta
          tatili sayısını verir; ikinci sayfada bu günler tarihleriyle listelenir. Tutar içermez. Mali müşavirin sistemine bunu bakarak
          girebilir ya da dosyayı gönderebilirsiniz.
        </p>
        <p className="not">
          <b>Hak ediş listesi (Excel)</b> tutarları içerir; kooperatifin kendi ödemesi içindir, yalnız gerekiyorsa paylaşın.
        </p>
      </>
    ),
  },
  {
    baslik: "Personel ayrıldı",
    alt: "Personel → kişinin adı → Kişi bilgisi",
    icerik: (
      <p>
        Kişinin kartında <b>Durum</b>&apos;u <b>Ayrıldı</b> yapın ve <b>Ayrılış</b> tarihini girin. Kişi silinmez; geçmiş ayları ve
        puantajı yerinde kalır, ayrıldığı aydan sonra listelerde görünmez.
      </p>
    ),
  },
];

const KURALLAR = [
  "Her alış, satış, tahsilat ve ödeme programa girilsin — girilmeyen işlem raporda yoktur.",
  "Aynı gün girin. Ertesi güne kalan kayıt unutulur; aynı gün girilen yanlışı da kendiniz iptal edebilirsiniz.",
  "Belge numarasını (fatura, dekont) yazın; sonradan aramak kolaylaşır.",
  "Sayıları yazarken virgül kullanabilirsiniz: 12,5",
  "Telefonda tarih, vade, iskonto gibi az kullanılan alanlar “Daha fazla” altındadır; dokununca açılır.",
  "Ekrandaki “Muhasebe karşılığı” kutusu bilgi içindir; bir şey seçmeniz gerekmez, program kendisi oluşturur.",
];

export default async function YardimPage() {
  const rol = await mevcutRol();
  const yonetici = yoneticiMi(rol);
  const maasYetkili = maasGorurMu(rol);
  return (
    <div className="yardim">
      <div className="sayfa-bas">
        <div>
          <h1>Kılavuz</h1>
          <p>Günlük işler adım adım — bir başlığa tıklayın</p>
        </div>
        <div className="ust-araclar">
          <YazdirDugmesi />
        </div>
      </div>

      <Link href="/yardim/ilk-kurulum" className="kart kart-ic" style={{ display: "block", marginBottom: 16, textDecoration: "none", color: "inherit" }}>
        <b>İlk kurulum rehberi →</b>
        <span className="soluk" style={{ display: "block", marginTop: 4, fontSize: 13.5 }}>
          Programı baştan kuran kişi için görsel, adım adım rehber: hesaplar, kartlar, açılış bakiyeleri.
        </span>
      </Link>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-bas">
          <h2>Altın kurallar</h2>
        </div>
        <ul className="kart-ic yardim-liste" style={{ margin: 0 }}>
          {KURALLAR.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-bas">
          <h2>Telefondan kullanım</h2>
        </div>
        <ul className="kart-ic yardim-liste" style={{ margin: 0 }}>
          <li>
            Alttaki çubuk: <b>Ana sayfa</b>, en çok kullanılan bölümler, ortada büyük <B>＋</B> ve <B>Menü</B>.
          </li>
          <li>
            <B>＋</B> yeni kayıt içindir: satış, tahsilat, alış, ödeme, üretim, sayım… Tek dokunuşla ilgili form açılır.
          </li>
          <li>
            <B>Menü</B> tüm bölümleri gösterir; en altta hesabınız ve <b>Çıkış</b> var.
          </li>
          <li>
            <b>Ana ekrana ekleyin</b>, uygulama gibi açılsın: iPhone&apos;da Safari → Paylaş (kare ve ok) → <b>Ana Ekrana Ekle</b>.
            Android&apos;de Chrome → sağ üstte ⋮ → <b>Ana ekrana ekle</b> (ya da <b>Uygulamayı yükle</b>).
          </li>
        </ul>
      </div>

      <div className="kart">
        {BOLUMLER.map((b, i) => (
          <details className="hp" key={b.baslik}>
            <summary>
              <span className="grup-no">{i + 1}</span>
              <span>
                {b.baslik}
                <br />
                <small>{b.alt}</small>
              </span>
            </summary>
            <div className="yardim-icerik">{b.icerik}</div>
          </details>
        ))}
      </div>

      {maasYetkili && (
        <div className="kart" style={{ marginTop: 16 }}>
          <div className="kart-bas">
            <h2>Personel, puantaj ve maaş</h2>
            <span className="soluk" style={{ fontSize: 13 }}>
              Bu bölümü yalnızca Başkan, Operasyon yöneticisi, ön muhasebe ve bilgi işlem görür
            </span>
          </div>
          <p className="kart-ic soluk" style={{ fontSize: 13.5, paddingBottom: 0, margin: 0 }}>
            Program kim kaç gün çalıştı, ne hak etti onu tutar; resmi bordro değildir (sigorta, vergi, net maaş mali müşavirdedir).
            Ücretler kişisel veridir. Kayıt silinmez, her değişiklik kimin yaptığıyla saklanır ve kişinin kartında görünür.
          </p>
          {MAAS_BOLUMLERI.map((b, i) => (
            <details className="hp" key={b.baslik}>
              <summary>
                <span className="grup-no">{i + 1}</span>
                <span>
                  {b.baslik}
                  <br />
                  <small>{b.alt}</small>
                </span>
              </summary>
              <div className="yardim-icerik">{b.icerik}</div>
            </details>
          ))}
        </div>
      )}

      {yonetici && (
        <div className="kart" style={{ marginTop: 16 }}>
          <div className="kart-bas">
            <h2>Yönetim ve teknik destek için</h2>
            <span className="soluk" style={{ fontSize: 13 }}>Bu bölümü yalnızca Başkan, Operasyon yöneticisi ve teknik destek görür</span>
          </div>
          {YONETICI_BOLUMLERI.map((b, i) => (
            <details className="hp" key={b.baslik}>
              <summary>
                <span className="grup-no">{i + 1}</span>
                <span>
                  {b.baslik}
                  <br />
                  <small>{b.alt}</small>
                </span>
              </summary>
              <div className="yardim-icerik">{b.icerik}</div>
            </details>
          ))}
        </div>
      )}

      <p className="soluk" style={{ fontSize: 13, marginTop: 16 }}>
        Raporlar (Muhasebe → Raporlar) her an bakılabilir ve Excel olarak indirilebilir. Takıldığınız yeri not alın; kılavuza
        ekleyelim.
      </p>

      <div className="not">
        <b>Teknik destek:</b> programda hata görürseniz, bir ekran anlaşılmıyorsa, şifrenizi unuttuysanız ya da kayıt girerken takıldıysanız teknik desteğe ulaşın
        {TEKNIK_DESTEK.telefon ? (
          <>
            : <b>{TEKNIK_DESTEK.telefon}</b>
          </>
        ) : (
          "."
        )}{" "}
        Genel kooperatif işleyişi (karar, iptal, koordinasyon) için kooperatif yönetimine (Başkan ya da Operasyon yöneticisi) başvurun.
      </div>
    </div>
  );
}
