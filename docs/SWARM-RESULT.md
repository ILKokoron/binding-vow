# Swarm Binding Vow: SELESAI dan terbukti dua arah (2026-11-06)

Kode: ~/workspace/binding-vow/agents/
(near.js, notary.js, checker.js, judge.js, swarm.js)

## Arsitektur

- Notaris (notary.js): bekerja sebelum uang terkunci. Todo di bawah
  3 kata ditolak sebagai tidak bisa dinilai. Kata kabur ditandai.
  Tugas diklasifikasikan (digital-build, content, physical,
  learning, general) dan ditulis ulang jadi syarat bukti konkret:
  artefak + hash SHA-256 + sebelum deadline. Stake yang tidak
  sebanding dengan durasi ditandai sebagai peringatan, bukan
  blokir, karena keputusan uang tetap milik user.
- Checker (checker.js): pengukuran deterministik yang dipakai semua
  juri: proof URI bisa dijangkau atau tidak, status HTTP, ukuran
  byte, dan SHA-256 isi sebenarnya dibanding hash yang dikomit
  user di chain.
- Tiga juri, tiga aturan yang diterbitkan dan BERBEDA beneran:
  judge1 Literalist (setuju hanya kalau hash cocok persis),
  judge2 Formalist (setuju kalau bukti terjangkau dan hash dikomit,
  memeriksa bentuk bukan isi), judge3 Skeptic (setuju hanya kalau
  terjangkau, minimal 512 byte, dan hash cocok). Setiap juri jalan
  sebagai proses terpisah dengan akunnya sendiri, vote commit-reveal
  di chain, dan menulis laporan bukti JSON terbuka di
  agents/reports/.
- Orkestrator (swarm.js): menjalankan tiga juri lalu finalize.

## Bukti live

Kasus lulus, vow-3 (hash bukti benar): ketiga juri approve dari
aturan masing-masing, finalize tx Db3bPjMYxiSBxECEfupt8WziMCHB6
mBnpX1vrvKfjv7E, status "passed", fee_settled true. Laporan:
reports/vow-3-judge1.json sampai judge3.json.

Kasus gagal, vow-4 (hash bukti sengaja salah, file tetap bisa
dijangkau): Literalist reject, Formalist approve, Skeptic reject.
Mayoritas menolak untuk alasan yang bisa diaudit per juri.
Finalize tx 912WhecogixfbFUsG2YcvN9iBooCDFW82ZGwxa5ZkJa2, status
"failed", dan fee TETAP lunas ke juri: bayaran untuk memeriksa,
bukan untuk meluluskan. Lalu execute tx GydC6BxMENjT2W2Hsf1xNuqx
541jxD9S3UfY1NWMDLNy: status "executed", NFT terbakar
(nft_token null), stake 0.05 NEAR hangus ke alamat bakar.

Ini jawaban langsung atas kekhawatiran gadungan: kegagalan beneran
terjadi, tercatat, dan bisa diperiksa siapa saja, dan juri tidak
punya insentif meluluskan karena fee mereka tidak tergantung vonis.

## Catatan teknis

- RPC publik rpc.testnet.near.org tidak terjangkau dari VM ini
  (egress proxy timeout). Agents membaca chain lewat mirror
  FastNEAR rpc.testnet.fastnear.com. Penandatanganan tetap lewat
  near CLI resmi dan keychain lokal; kunci privat tidak pernah
  masuk ke kode agent.
- Bukti demo dilayani dari server HTTP lokal selama pengujian;
  checker-nya sendiri menjangkau URI apapun, jadi di demo final
  URI-nya URL publik (repo dan halaman deploy).

## Berikutnya

Frontend 4 layar: buat sumpah (dengan notaris di alurnya), sumpah
saya, kirim bukti, dan vonis beserta laporan juri yang terbuka.
