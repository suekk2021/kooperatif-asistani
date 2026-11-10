import Link from "next/link";
import { Aciklama, Ekran, Maket, No } from "@/components/yardim/Maket";
import { YazdirDugmesi } from "@/components/YazdirDugmesi";
import { ikonlar } from "@/components/iskelet/Ikonlar";

const B = ({ children }: { children: React.ReactNode }) => <b className="yardim-dugme">{children}</b>;

function Adim({ no, baslik, alt, children }: { no: number; baslik: string; alt: string; children: React.ReactNode }) {
  return (
    <section className="kart mk-adim" id={`adim-${no}`}>
      <div className="kart-bas">
        <h2>
          <span className="mk-adim-no">{no}</span> {baslik}
        </h2>
        <span className="soluk" style={{ fontSize: 13 }}>{alt}</span>
      </div>
      <div className="kart-ic yardim-govde">{children}</div>
    </section>
  );
}

const Kontrol = ({ children }: { children: React.ReactNode }) => (
  <p className="mk-kontrol">
    <b>Bitince:</b> {children}
  </p>
);

export default function IlkKurulumPage() {
  return (
    <div className="yardim">
      <div className="sayfa-bas">
        <div>
          <h1>İlk kurulum rehberi</h1>
          <p>Programı baştan kuran kişi için: neye nereden basılır, hangi sırayla ilerlenir</p>
        </div>
        <div className="ust-araclar">
          <Link href="/yardim" className="btn btn-cizgi">
            Günlük işler kılavuzu
          </Link>
          <YazdirDugmesi />
        </div>
      </div>

      <div className="not" style={{ marginTop: 0, marginBottom: 16 }}>
        <b>Şu an test dönemindesiniz.</b> Burada girdiğiniz her şey deneme sayılır ve test bitince silinir; rahatça deneyin, bir şeyi bozmanız mümkün
        değil. Bu rehber yalnızca <b>programı</b> anlatır. Hangi hesabın seçileceği gibi muhasebe kararları sizin ve mali müşavirin kararıdır; program
        ne seçerseniz onu uygular.
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-bas">
          <h2>Başlamadan önce hazır olsun</h2>
        </div>
        <ul className="kart-ic yardim-liste" style={{ margin: 0 }}>
          <li>
            <b>Mali müşavirden iki bilgi:</b> açılış tarihi ve açılış kaydının karşı hesabı. Bu ikisini programa <b>yönetici</b> (Başkan ya da Operasyon
            yöneticisi) girer; siz bilgiyi ona iletirsiniz. Gelene kadar beklemeyin, 1–5. adımlar buna bağlı değil.
          </li>
          <li>
            <b>Açılış günü rakamları:</b> kasadaki ve bankadaki para, müşterilerin bize borçları, bizim tedarikçilere borçlarımız, depo sayımı (miktar ve
            birim maliyet).
          </li>
          <li>
            <b>Listeler:</b> müşteriler, tedarikçiler, ürünler ve hammaddeler/ambalajlar.
          </li>
        </ul>
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-bas">
          <h2>Sıra</h2>
        </div>
        <ol className="kart-ic yardim-liste" style={{ margin: 0 }}>
          <li><a href="#adim-1">Programı tanıyın</a></li>
          <li><a href="#adim-2">Kasa ve banka hesaplarını açın</a></li>
          <li><a href="#adim-3">Müşterileri ve tedarikçileri açın</a></li>
          <li><a href="#adim-4">Stok kartlarını açın</a></li>
          <li><a href="#adim-5">Reçeteler (isteğe bağlı)</a></li>
          <li><a href="#adim-6">Açılış bakiyelerini girin</a></li>
          <li><a href="#adim-7">İlk işlemleri deneyin</a></li>
          <li><a href="#adim-8">Rakamları kontrol edin</a></li>
        </ol>
      </div>

      <Adim no={1} baslik="Programı tanıyın" alt="2 dakika">
        <p>
          Bilgisayarda soldaki menüyü, telefonda alttaki çubuğu kullanırsınız. Telefondan <B>ana ekrana ekleyin</B>: program uygulama gibi açılır
          (iPhone: Safari → Paylaş → Ana Ekrana Ekle; Android: Chrome → ⋮ → Ana ekrana ekle).
        </p>
        <Maket>
          <div className="mk-cubuk">
            <span>{ikonlar.panel}Ana sayfa</span>
            <span>{ikonlar.satis}Satış</span>
            <span className="mk-arti"><b>{ikonlar.arti}</b><No n={1} /></span>
            <span>{ikonlar.kasa}Kasa</span>
            <span>{ikonlar.menu}Menü<No n={2} /></span>
          </div>
        </Maket>
        <Aciklama
          maddeler={[
            <>
              <B>＋</B> yeni kayıt içindir: satış, tahsilat, alış, ödeme, üretim, sayım. Dokununca ilgili form açılır.
            </>,
            <>
              <B>Menü</B> bütün bölümleri gösterir. <b>Kılavuz</b> da burada; takıldığınızda bakın.
            </>,
          ]}
        />
      </Adim>

      <Adim no={2} baslik="Kasa ve banka hesaplarını açın" alt="Kasa ve Banka → Yeni hesap">
        <p>
          &quot;Merkez kasa&quot; hazır gelir. Bankalarınızı, kartlı ödeme cihazınızı (POS) ve varsa şirket kredi kartınızı siz açarsınız.
        </p>
        <Ekran ad="kasa-yeni-hesap" alt="Kasa ve Banka ekranında Yeni hesap formu" />
        <Aciklama
          maddeler={[
            <>
              <B>Yeni hesap</B> sekmesine basın.
            </>,
            <>
              <b>Tür:</b> Kasa, Banka, POS (kartla ödeme cihazı) ya da Kredi kartı.
            </>,
            <>Herkesin tanıyacağı bir ad yazın (ör. &quot;Ziraat vadesiz&quot;).</>,
            <>
              <B>Kaydet</B>. POS açıyorsanız ayrıca <b>Para hangi bankaya geçiyor?</b> ve <b>Komisyon %</b> alanları çıkar.
            </>,
          ]}
        />
        <Kontrol>Kasa ve Banka ekranının üstünde açtığınız hesap görünür.</Kontrol>
      </Adim>

      <Adim no={3} baslik="Müşterileri ve tedarikçileri açın" alt="Cariler → Müşteriler / Tedarikçiler">
        <Ekran ad="cariler-yeni-musteri" alt="Cariler ekranında yeni müşteri formu" />
        <Aciklama
          maddeler={[
            <>Önce doğru sekmede olun (Müşteriler / Tedarikçiler): satış yaptığınız yerler <b>Müşteriler</b>, mal aldığınız firmalar <b>Tedarikçiler</b>.</>,
            <>
              <B>+ Yeni müşteri</B> (tedarikçi sekmesinde <B>+ Yeni tedarikçi</B>) düğmesiyle formu açın; açılınca form başlığı burada görünür.
            </>,
            <>Yalnızca <b>Ünvan / ad</b> zorunlu. Aynı kişiyi iki kez açmamak için önce listeye bakın.</>,
            <>
              <b>Vade (gün):</b> müşteriye kaç gün vade veriliyorsa yazın; satış girerken vade tarihi buna göre kendiliğinden gelir. Peşin ise boş bırakın.
            </>,
          ]}
        />
        <Kontrol>Kişi, müşteri/tedarikçi listesinde görünür. Her cari için muhasebe hesabı programda kendiliğinden açılır, siz bir şey yapmazsınız.</Kontrol>
      </Adim>

      <Adim no={4} baslik="Stok kartlarını açın" alt="Stok → + Yeni stok kartı">
        <Ekran ad="stok-yeni-kart" alt="Stok ekranında yeni stok kartı formu" />
        <Aciklama
          maddeler={[
            <><B>+ Yeni stok kartı</B> düğmesiyle formu açın; açılınca form başlığı burada görünür.</>,
            <>
              <b>Tür</b> önemli: aşağıdaki tabloya bakın.
            </>,
            <>
              <b>Birim:</b> kg, g, lt, adet, paket, koli.
            </>,
            <>
              <b>Asgari stok:</b> bu miktarın altına inince program uyarır (isteğe bağlı).
            </>,
            <>
              <B>Kartı aç</B>.
            </>,
          ]}
        />
        <div className="tablo-kutu">
          <table className="yardim-tablo">
            <thead>
              <tr>
                <th>Tür</th>
                <th>Ne için</th>
                <th>Örnek</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><b>Hammadde</b></td><td>Üretimde kullanılan malzeme</td><td>Un, peynir, yağ</td></tr>
              <tr><td><b>Ambalaj</b></td><td>Paketleme malzemesi</td><td>Kutu, poşet, etiket</td></tr>
              <tr><td><b>Yarı mamul</b></td><td>Üretilip başka bir üründe kullanılan ara ürün</td><td>Hazır hamur, iç harcı</td></tr>
              <tr><td><b>Ürün (mamul)</b></td><td>Kendi ürettiğimiz, sattığımız ürün. Liste satış fiyatı bu türde girilir.</td><td>Su böreği, mantı</td></tr>
              <tr><td><b>Ticari mal</b></td><td>Alıp üretmeden aynen sattığımız mal</td><td>Hazır ürün</td></tr>
            </tbody>
          </table>
        </div>
        <Kontrol>Kart Stok listesinde görünür. Kartı yanlış türde açtıysanız kartın içinden &quot;Kartı düzenle&quot; ile düzeltirsiniz.</Kontrol>
      </Adim>

      <Adim no={5} baslik="Reçeteler (isteğe bağlı)" alt="Üretim → Reçeteler">
        <p>
          Reçete, bir ürünün kaç kg/adet malzemeyle yapılması gerektiğini söyler; üretimde gerçek tartımla karşılaştırılıp sapma gösterilir.{" "}
          <b>Zorunlu değildir.</b> Bilmiyorsanız ilk 2–4 haftanın partilerini reçetesiz girin, sonra gerçek tartımlardan ortalama çıkarıp reçeteyi yazın.
          Yazmak isterseniz: <B>Üretim</B> → <B>Reçeteler</B>, ürünü seçin, <b>Kaç … için?</b> alanına çıktı miktarını, altına malzemeleri ve miktarlarını girip
          <B>Reçeteyi kaydet</B> deyin. Ürün kartı önce <b>Ürün (mamul)</b> türünde açılmış olmalı.
        </p>
      </Adim>

      <Adim no={6} baslik="Açılış bakiyelerini girin" alt="Ana Panel → Açılış bakiyeleri">
        <p>
          Programa geçiş günündeki durumu girersiniz: kasa/banka bakiyeleri, müşteri ve tedarikçi bakiyeleri, depodaki mal. Açılış ekranına{" "}
          <b>Ana Panel&apos;deki kurulum adımlarından</b> &quot;Açılış bakiyeleri ve ilk stok sayımı&quot; satırının <B>Aç</B> / <B>Ekle</B> düğmesiyle gidersiniz. Girmeden
          önce kartların (2, 3 ve 4. adımlar) açık olması gerekir, çünkü bakiyeler kartların karşısına yazılır.
        </p>
        <Ekran ad="acilis" alt="Açılış ekranı" />
        <Aciklama
          maddeler={[
            <>
              Üstte açılış tarihi ve karşı hesap yazıyorsa hazırsınız. Bunun yerine sarı bir uyarı görüyorsanız yönetici henüz girmemiştir; bilgiyi ona iletin. O
              zamana kadar tabloyu doldurabilirsiniz ama kaydedemezsiniz.
            </>,
            <>
              Üç sekme var: <b>Kasa ve Banka</b>, <b>Cariler</b>, <b>Depo sayımı</b>. Her birini ayrı kaydedin.
            </>,
            <>
              Yalnızca bakiyesi olan satırları doldurun; boş satırlar kaydedilmez. <b>Müşteri:</b> bize borcu. <b>Tedarikçi:</b> bizim ona borcumuz. Fazla ödeme
              ya da avans varsa eksi (−) yazın. Kredi kartında o günkü kart borcunu yazın. Depoda <b>sayılan miktarı</b> ve <b>birim maliyeti</b> yazın; maliyet
              bilinmiyorsa son alış fiyatı.
            </>,
            <>
              <B>Açılışa kaydet</B>.
            </>,
          ]}
        />
        <p className="not" style={{ marginTop: 0 }}>
          <b>Yanlış girdiyseniz:</b> sayfanın altındaki &quot;Açılış kayıtları&quot; listesinde, kendi girdiğiniz kaydın yanında <B>İptal et</B> düğmesi çıkar (aynı gün). Sonra
          doğrusunu yeniden girin. Eski günlerin ve başkasının kayıtlarını yönetici iptal eder.
        </p>
        <Kontrol>Ana Panel&apos;de nakit ve alacak rakamları girdiğiniz bakiyelerle uyuşur.</Kontrol>
      </Adim>

      <Adim no={7} baslik="İlk işlemleri deneyin" alt="Günlük işler kılavuzu">
        <p>
          Kuruluş bitti. Şimdi tek tek gerçek işlemleri deneyin: bir <b>alış</b>, bir <b>üretim partisi</b>, bir <b>satış</b>, bir <b>tahsilat</b>. Her işin adımı{" "}
          <Link href="/yardim">Günlük işler kılavuzunda</Link> yazıyor. Altın kural: her işlemi aynı gün girin ve fatura/dekont numarasını yazın.
        </p>
      </Adim>

      <Adim no={8} baslik="Rakamları kontrol edin" alt="Raporlar">
        <p>
          <B>Muhasebe</B> → <B>Raporlar</B>&apos;da <b>Mizan</b> raporunu açın ve mali müşavirin açılış rakamlarıyla karşılaştırın. <b>Alacak yaşlandırma</b> hangi
          müşterinin ne kadar geciktiğini, <b>Satış-kârlılık</b> ve <b>Fire</b> raporları kazancı ve kaybı gösterir. Raporlar Excel olarak indirilebilir.
        </p>
        <Kontrol>Rakamlar mali müşavirin elindekiyle tutuyor. Tutmuyorsa hangi hesapta fark olduğunu not edip yöneticiye iletin.</Kontrol>
      </Adim>

      <p className="soluk" style={{ fontSize: 13, marginTop: 16 }}>
        Takıldığınız, anlaşılmayan ya da yanlış bulduğunuz her şeyi not edin ve yöneticiye iletin; rehber buna göre güncellenir.
      </p>
    </div>
  );
}
