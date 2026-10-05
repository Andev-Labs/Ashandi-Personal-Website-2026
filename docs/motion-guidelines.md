# Motion guidelines

Preferensi pengguna, ditetapkan 12 September 2026: ketika meminta **smooth**,
**halus**, atau **fluid**, gunakan prinsip di bawah untuk
mendesain perilaku komponen. Fokusnya adalah kontinuitas bentuk, respons input,
dan hubungan antargerakan yang terasa masuk akal.

Referensi desain dan atribusi dikumpulkan di [Credits](https://daniasyrofi.github.io/syrofolio/credits/).
Catatan di bawah menyimpan bukti teknis dari studi tersebut.

## Dasar analisis dan batas bukti

Analisis mencakup empat contoh yang dikirim pengguna: Search, Carousel,
SloshSlider, dan CreateMenu. Ini bukan audit semua komponen Bencho atau pengukuran
frame rate di perangkat nyata.

Sumber yang diperiksa:

- Lampiran pengguna `76211339-1ddb-4dfc-abdd-62f024f1d633/pasted-text.txt`:
  ekspor Search/Seek beserta CSS.
- Lampiran pengguna `e54ad1be-96b1-4507-87e3-68817df6ce88/pasted-text.txt`:
  ekspor Carousel beserta CSS; `SHOTS` sengaja kosong.
- Lampiran pengguna `48c9f788-c9d7-43a5-9f40-d2112964acf5/pasted-text.txt`:
  catatan desain Create, bukan keseluruhan komponen.
- Cuplikan Slosh dan API empat komponen dalam pesan pengguna.
- [Situs Bencho](https://bencho.dev/),
  [bundle JS yang diperiksa](https://bencho.dev/assets/index-O7JKZZmz.js), dan
  [CSS yang diperiksa](https://bencho.dev/assets/index-B2qFwCFP.css).
  Diambil 12 September 2026; URL bundle dapat berubah pada deployment berikutnya.
- [Repository yang dirujuk](https://github.com/lorenzo04us/Bencho) dan endpoint
  GitHub API mengembalikan HTTP 404 saat diperiksa. Penyebabnya tidak diketahui.

Source yang dieksekusi menjadi rujukan perilaku versi tersebut. Komentar membantu
menjelaskan maksud desain, tetapi beberapa angka dan deskripsi sudah tertinggal.

## Kontrak desain yang dipakai untuk pekerjaan berikutnya

1. **Pertahankan identitas objek.** Jika tombol menjadi panel, pertahankan satu
   permukaan yang berubah ukuran. Isi boleh berganti, tetapi kontur dan pusatnya
   harus memberi hubungan yang jelas antara keadaan awal dan akhir.
2. **Tentukan geometri sebelum timing.** Tetapkan pusat, inset, batas gerak, dan
   aturan radius. Gerak ikon yang muncul sebagai akibat shell membesar tidak perlu
   diberi animasi posisi terpisah.
3. **Satu driver untuk gerak yang saling bergantung.** Turunkan posisi, skala,
   reveal, atau cahaya dari progress/posisi yang sama. Ini berlaku per sistem
   gerak, bukan berarti seluruh komponen hanya boleh punya satu angka.
4. **Satu pemilik untuk setiap properti.** Jangan menambahkan CSS transition pada
   nilai yang sudah diintegrasikan spring. Pisahkan ring, drift, dan tilt ke
   wrapper berbeda jika masing-masing menulis transform. Alternatifnya, satu
   penulis boleh menggabungkan beberapa transform secara eksplisit.
5. **Input utama langsung merespons.** Handle mengikuti pointer selama drag.
   Spring cocok untuk settle atau materi sekunder yang mengikuti handle. Press
   memberikan respons segera; jangan menahan pekerjaan pengguna demi animasi.
6. **Gerak lanjutan mengikuti sebabnya.** Kecepatan release menentukan carry;
   kecepatan fill menentukan kemiringan permukaan; kedalaman menentukan skala dan
   urutan tumpukan. Tambahkan gerak saat gerak itu menjelaskan perubahan keadaan.
7. **Gerak harus bisa diinterupsi.** Ambil posisi saat ini ketika target berubah.
   Pertahankan velocity untuk spring yang diretarget; batalkan settle saat drag
   baru dimulai. Hindari timer lama yang membuka ulang komponen yang sudah ditutup.
8. **Sambungkan fase tanpa jeda kosong.** Press, transform shell, dan reveal isi
   dapat overlap. Jangan menunggu shell selesai baru menampilkan isi atau membuat
   kontrol bisa digunakan. Besar overlap disesuaikan konteks.
9. **Amplitudo punya batas.** Magnet cukup beberapa piksel, carry dibatasi agar
   objek masih bisa diikuti, dan hover berhenti saat mengganggu drag atau pengetikan.
10. **Smooth mencakup fungsi dan biaya rendering.** Fokus, keyboard, touch,
    reduced motion, kontras, serta loop yang berhenti saat idle adalah bagian
    dari hasil akhir.

## Cara empat contoh bekerja

### Search: shell membesar mengelilingi ikon

Ekspor yang diberikan memakai `SHUT = 64`, `LENS = 28`, sehingga inset adalah
`(64 - 28) / 2 = 18px`. Default field 320px, atau 280px pada layout sempit.
Angka 44/18/13 dalam komentar menjelaskan versi terdahulu.

Lebar shell mengikuti spring. Progress reveal dihitung dari lebar yang sedang
digambar, bukan timer terpisah:

```js
p = clamp((widthNow - shut) / Math.max(1, openWidth - shut), 0, 1);
reveal = clamp((p - 0.55) / 0.45, 0, 1);
```

Teks muncul pada 45% terakhir rentang progress; komentar menyebutnya “last third”,
tetapi rumusnya dimulai pada 55%. Teks juga bergeser sampai 6px dari nilai reveal
yang sama. Ikon tetap terikat ke inset kiri. Frame menjaga komposisi tetap terpusat.

Radius default 32px pada tinggi 64px menghasilkan lingkaran/pill. Source CSS
memakai `--sek-r`, sehingga prop corner yang lebih kecil memang mengubah bentuk;
`999px` dalam catatan bukan aturan mutlak untuk setiap setting.

Klik memberi beat press 90ms, lalu membuka dan memfokuskan input bersamaan.
Magnet membaca frame yang tidak bergerak, mengoreksi skala tampilan, dan membatasi
tarikan dengan radius 110px serta envelope 2–7px. Listener magnet dilepas saat
terbuka; offset terakhir tidak secara eksplisit direset di effect tersebut.
Untuk adaptasi produk, kembalikan offset ke pusat ketika membuka.

Width dimiliki spring JS; transform magnet/press dimiliki CSS. Jadi keberadaan
spring dan CSS di komponen yang sama sah karena properti yang mereka kontrol berbeda.

### Carousel: satu posisi ring menghasilkan seluruh komposisi

`turn` adalah posisi kontinu dalam satuan langkah kartu. Untuk setiap kartu:

```js
theta = (index - turn) * (2 * Math.PI / count);
frontness = (Math.cos(theta) + 1) / 2;
x = Math.sin(theta) * orbit;
y = -(1 - frontness) * lift;
scale = mix(backScale, 1, frontness);
zIndex = Math.round(frontness * 100);
```

Dengan ini, kartu otomatis mengecil dan naik ketika berpindah ke belakang.
Ekspor memakai `lift = 38px`; catatan yang dikirim menyebut 22px. Kedalaman cukup
dijelaskan oleh posisi, skala, dan urutan tumpukan; opacity kartu tidak ikut berubah
sehingga keseluruhan carousel tidak tampak berdenyut saat digeser.

`turn` tidak dibatasi atau di-wrap ketika dianimasikan. Trigonometri sudah periodik;
menginterpolasi nilai yang di-wrap melintasi seam dapat memilih rute yang salah.
Modulo boleh dipakai untuk label/index logis, terpisah dari posisi animasi kontinu.

Selama drag: `turn = turnAtGrab - dx / 140`. Velocity diukur dari sampel pointer
terakhir dan diratakan. Release memproyeksikan carry sejauh 150ms, dibatasi ±2
langkah, kemudian memilih target integer. Settle memakai quartic ease-out
`1 - (1 - p)^4`, bukan spring. Durasi default 620ms; knob settle mengubah durasinya.

Wrapper `slot → float → card` memisahkan ring, CSS drift, dan spring tilt. Drift
memakai periode berbeda per kartu. Tilt dan cahaya membaca posisi pointer yang
sama; tilt dinonaktifkan selama drag. Shadow tetap agar tidak berkedip bergantian.
Perhatian: source tilt membaca bounding box kartu yang ditransformasi; aturan
frame stabil pada Search belum diterapkan merata ke semua komponen.

### Slosh: kontrol kaku, isi punya massa

Handle langsung menerima nilai pointer. Fill mengikuti handle lewat spring
sekunder. Pada release, handle bergerak dengan velocity terakhir yang meluruh.
Jadi sumber kelenturan terletak pada materi yang mengikuti kontrol.

Dengan `soft = viscosity / 100`, stiffness fill adalah `0.34 - 0.29 * soft` dan
retensi velocity per frame adalah `0.74 + 0.22 * soft`. Nilai retensi yang lebih
tinggi berarti kehilangan energi lebih kecil, meskipun variabel disebut damping.
Setting viscosity nol langsung menyamakan fill dengan handle dan menghapus velocity
fill. Momentum handle adalah knob terpisah: viscosity nol saja tidak menonaktifkan
coast sesudah release.

Fill yang membentur 0/100 memantul dengan velocity dibalik dan dikali 0.42.
Leading edge dibuat dengan `clip-path`, dengan lean dari velocity fill yang
dibatasi ±20px. Tubuh bar tetap menempel pada track.

Bundle live mengonfirmasi mekanik ini, penulisan langsung ke DOM, keyboard slider,
serta penghentian loop saat semua nilai tenang. Namun warna CSS live sudah berbeda
dari contoh alpha 0.14/0.24 yang dikirim. Pertahankan prinsip kontras materi saat
memetakan ke tema sendiri, bukan menyalin alpha tanpa diperiksa.

### Create: permukaan utama dan highlight yang kontinu

Catatan pengguna menjelaskan shell yang berubah dari pill menjadi panel, press
95ms yang overlap dengan shrink sekitar 120ms, dan width/height/radius memakai
480ms pada kurva yang sama. Rows menyusul pada `70 + index * 38ms`. Maksud desainnya
jelas: satu transformasi utuh tanpa fase panel kosong atau sudut yang bergoyang.

**Versi live berbeda:** bundle yang diperiksa membuka setelah 60ms, menampilkan
rows dengan delay `30 + index * 22ms`, dan menggerakkan shell menggunakan Framer
Motion dengan konfigurasi spring `stiffness: 420, damping: 30, mass: 0.5`. Rasio
redam kontinu `30 / (2 * sqrt(420 * 0.5)) ≈ 1.035` menunjukkan konfigurasi overdamped:
spring ini mendukung tujuan settling tanpa osilasi dari kondisi diam. Jadi perubahan
mesin dari catatan CSS tidak otomatis berarti intent tanpa bounce ditinggalkan.
Shell live berukuran
212×166px saat terbuka; width pill mengikuti pengukuran label. CSS memakai absolute
inset dan auto margin untuk memusatkan shell. Karena itu jangan menyebut seluruh
Create live sebagai animasi CSS 480ms tanpa spring atau sebagai geometri tanpa
pengukuran.

Highlight hover tetap satu elemen yang berpindah antarbaris. Transform travel dan
scale stretch punya timing berbeda; stretch cepat lalu pulih lebih pelan. CSS live
memakai travel 380ms dan scale 110ms masuk/300ms kembali, dengan stretch 0.96×1.16.
Versi live tidak memasang filter goo pada `.crt-blobs` seperti salah satu catatan.

Prinsip adaptasinya: pusat shell stabil, dimensinya bergerak serempak, isi hadir
selagi shell bergerak, highlight mempertahankan identitas, dan spring dipilih
hanya jika hasil radius serta settling-nya bersih pada ukuran aktual.

## Memilih mesin animasi

| Situasi | Model yang dipilih | Alasan |
| --- | --- | --- |
| Hover/press atau perubahan keadaan sederhana | CSS transition dengan properti eksplisit | Dapat diretarget dari nilai yang sedang tampil |
| Drag utama | Nilai pointer langsung | Menjaga kontrol terasa melekat pada tangan |
| Return elastis atau materi yang mengikuti input | Spring dengan posisi dan velocity | Mempertahankan kontinuitas saat target berganti |
| Throw menuju slot yang pasti | Proyeksi velocity lalu easing ke target | Mendarat pada posisi yang valid dan mudah diikuti |
| Morph panel | Shared progress atau timing yang sama | Menjaga dimensi, sudut, dan isi saling terkait |
| Ambient drift yang memang diperlukan | CSS transform keyframes pada wrapper sendiri | Tidak bertabrakan dengan drag atau tilt |

Project ini memakai HTML/CSS dan JavaScript vanilla pada portfolio utama. Pola
tersebut bisa diterapkan dengan runtime yang ada; tidak perlu memasang React atau
Framer Motion hanya karena contoh sumber menggunakannya.

## Catatan implementasi dan pemeriksaan

Spring helper di lampiran menggunakan timestep dalam unit frame 60Hz:

```js
dt = clamp(elapsedMs / 16.67, 0, 2.5);
velocity += (target - position) * stiffness * dt;
velocity *= retention ** dt;
position += velocity * dt;
```

Retensi eksponensial menormalkan peluruhan terhadap waktu. Integrasi posisi masih
numerik dan tidak persis sama pada semua refresh rate; clamp juga sengaja membuang
sebagian waktu setelah stall. Untuk spring yang sensitif, pakai timestep tetap
dengan substep terbatas atau solver analitik, lalu periksa 60Hz/120Hz dan frame drop.

Threshold berhenti harus sesuai unit. Helper memakai delta dan velocity <0.02;
angka ini cocoknya dievaluasi ulang untuk posisi piksel versus pointer -1..1.
Carousel sendiri memakai helper yang sama untuk pointer ternormalisasi dan cahaya
0..1, sehingga komentar bahwa semua caller memakai piksel tidak sepenuhnya benar.

Saat mengadaptasi ke produk:

- Uji open–close cepat, reverse di tengah gerak, drag saat settle, pointer keluar,
  pointercancel/lost capture, resize, zoom, dan konten dinamis. Tidak boleh snap ke
  posisi lama atau ada gesture yang terus aktif setelah batal.
- Ukur input terhadap koordinat stabil jika output ikut bergerak; koreksi skala
  visual. Baca layout secara terkelompok sebelum menulis style bila memungkinkan.
- Jaga satu penulis aktif per properti. Mode autoplay dan settle harus saling
  mengecualikan; source Carousel memiliki loop spin terpisah yang perlu koordinasi
  tambahan jika autoplay diaktifkan dalam carousel interaktif.
- Hentikan rAF, timer, dan listener ketika selesai/unmount. Pause ambient motion
  ketika tersembunyi/offscreen; CSS keyframes tidak otomatis menjamin semuanya gratis.
- Dahulukan transform/opacity untuk perpindahan. Width/height boleh untuk morph
  geometri yang memang membutuhkannya dalam frame stabil; ukur biaya layout/paint.
  Clip-path, gradient, blur, dan shadow juga perlu profiling, bukan diasumsikan GPU.
- Reduced motion menyederhanakan gerak dan menghapus drift/coast yang tidak perlu.
  CSS saja tidak menghentikan spring JS; tangani keduanya, termasuk perubahan
  preferensi saat sesi berjalan jika relevan.
- Pertahankan focus-visible, keyboard, nilai ARIA, hit target, dan dismiss yang
  jelas. Hidden content jangan tetap bisa ditab. Uji fokus saat membuka/menutup.
- Search contoh memakai `inputMode="none"` pada touch untuk demo galeri. Search
  produk harus membuka keyboard normal. Create produk memerlukan keyboard, Escape,
  dan pengembalian fokus yang sesuai; source contoh bukan bukti aksesibilitas lengkap.
- Map surface/ink/font ke token yang sudah ada, fallback di root komponen. Jangan
  menambah glass atau stroke hanya untuk mengejar kesan smooth.

Jika kelak mengambil implementasinya, sertakan notice MIT yang sesuai dengan
[lisensi Bencho](https://bencho.dev/licence). Foto Carousel tidak ikut dalam ekspor
berlisensi tersebut; gunakan aset project. Dokumen ini menyimpan analisis dan
preferensi, bukan salinan komponen untuk produksi.

## Ukuran keberhasilan

Hasil dianggap sesuai ketika objek tetap terbaca selama transisi, respons pertama
terasa segera, perubahan arah tidak melompat, komponen bisa digunakan ketika
bergerak, hubungan gerak masuk akal, dan penggunaan idle/reduced motion tetap baik.
Durasi panjang, bounce, blur, dan banyak lapisan animasi bukan syarat keberhasilan.
