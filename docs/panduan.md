# Mulai dari sini

1. Klik **Use this template** di GitHub untuk membuat repositori milikmu.
2. Install Node.js 22 atau lebih baru, lalu jalankan `npm ci`, `npm run setup`, dan `npm run dev`.
3. Buka `http://localhost:4310`. Edit **`content/site.json`**, simpan, lalu refresh.

Semua data utama ada dalam satu file: nama, email, kota, zona waktu, slogan,
foto, deskripsi situs, bio, proyek, tulisan, dan tautan sosial. Copy bahasa
Inggris ada di `copy.en`; bahasa Indonesia di `copy.id`.

Nama demo tetap Dani Asyrofi, tetapi bio, proyek, dan tulisan adalah contoh.
Ganti identitas, foto, `hello@example.com`, dan tautan `your-username` sebelum
menerbitkan situsmu. Foto demo hanya memakai satu gaya untuk kedua tema.

Untuk foto biasa, simpan foto ke `public/assets/images/me.webp`, ubah
`profile.portrait` ke `/assets/images/me.webp`, lalu pilih `portraitMode: "image"`.
Untuk efek mengikuti kursor, gunakan mode `sprite` dengan gambar 3×3 sesuai
[panduan lengkap](customization.md#portrait).

Setiap proyek dan tulisan otomatis mendapat halaman sendiri. Urutan array
menentukan urutan tampil. Duplikasi satu objek untuk menambah item; setiap
`slug` harus unik. Tulisan minimal satu agar bookshelf tetap dapat digunakan.

Sebelum deploy, jalankan `npm run check`, `npm test`, dan `npm run build`.
Upload folder **`dist/`**. Set `meta.url` ke domainmu dengan garis miring terakhir.
Untuk GitHub Pages, aktifkan **Source: GitHub Actions** pada Settings → Pages,
tambahkan variable Actions `ENABLE_PAGES` bernilai `true`, lalu jalankan workflow
**Deploy preview**. [Panduan deployment](deployment.md) menjelaskan detailnya.

Panel Style menyimpan pilihan di browser pengunjung. Tombol Save tidak mengedit
kode. Tombol kontak menyalin alamat email; tidak ada backend pengiriman pesan.

Lisensi rilis ini **source-available, bukan MIT**. Boleh digunakan dan dimodifikasi
untuk situs sendiri, termasuk situs bisnis; boleh dibagikan gratis dengan notice.
Dilarang menjual ulang template atau paket turunannya. Penggunaan untuk situs
klien berbayar memerlukan izin tertulis. Tidak ada nominal denda otomatis.
Hak MIT yang sudah diberikan pada rilis lama tetap berlaku. Baca [LICENSE](../LICENSE).
