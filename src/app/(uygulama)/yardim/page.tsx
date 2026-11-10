import { YazdirDugmesi } from "@/components/YazdirDugmesi";

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
          Kendi girdiğiniz kaydı <b>aynı gün</b> iptal edebilirsiniz. Daha eski kayıtlar ve başkasının kayıtları için yöneticiye
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
        <li>Bot sizi tanımıyorsa size bir numara söyler; o numarayı yöneticiye iletin.</li>
      </ul>
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

export default function YardimPage() {
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

      <p className="soluk" style={{ fontSize: 13, marginTop: 16 }}>
        Raporlar (Muhasebe → Raporlar) her an bakılabilir ve Excel olarak indirilebilir. Takıldığınız yeri not alın; kılavuza
        ekleyelim.
      </p>
    </div>
  );
}
