-- Temizlik malzemesi, iş kıyafeti gibi üretime girmeyen ama stokta takip edilen kalemler için yeni stok türü.
-- Yeni enum değeri aynı işlemde kullanılamadığı için ayrı dosyada; stok grupları bir sonraki migration'da.
alter type public.stok_turu add value if not exists 'yardimci';
