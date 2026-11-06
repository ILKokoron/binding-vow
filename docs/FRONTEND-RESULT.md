# Frontend Binding Vow: LIVE dan terverifikasi klik (2026-11-06)

Live: https://binding-vow-ilkokorons-projects.vercel.app
(Vercel project binding-vow, SSO protection dimatikan agar publik
bisa membuka; deployment dpl_4EDFLg4gcdpttvzcW1T2V1sQgpRy.)
Kode: ~/workspace/binding-vow/frontend/ (index.html, style.css,
app.js, reports/ berisi 6 laporan juri untuk vow-3 dan vow-4).

## Empat layar

1. Make a vow: tugas ditulis bebas, tombol Ask the notary menjalankan
   aturan notaris yang sama dengan agents (penolakan tugas kabur,
   kategori, syarat bukti, peringatan stake), lalu Seal the vow
   mengirim create_vow lewat wallet pengunjung (MyNearWallet).
2. My vows: membaca nft_tokens_for_owner dan get_vow langsung dari
   kontrak lewat RPC, menampilkan kartu per sumpah: status, tugas,
   syarat bukti, stake dan fee, deadline, tujuan hangus, bukti, vote.
3. Proof: memilih file bukti, SHA-256 dihitung di browser
   (crypto.subtle), hash itu yang dikomit ke chain bersama link.
4. Verdicts: memuat satu sumpah dari chain, tabel vote per juri
   dengan personanya, dan tautan laporan bukti JSON lengkap untuk
   kasus referensi vow-3 dan vow-4.

## Verifikasi (browser nyata, klik per layar, 2026-11-06 17:12-17:16 WIB)

- Layar Make tampil default, header dan tombol wallet benar.
- Notary menerima "Publish the Binding Vow contract repo to GitHub"
  sebagai digital-build dan tombol Seal merah muncul. (Laporan
  penguji memparafrase teks syarat bukti; teks persis di app.js
  yang terdeploy sudah dicek cocok dengan sumber lokal.)
- My vows untuk bindingvow1106.testnet memuat 2 kartu live dari
  chain: vow-2 ACTIVE dan vow-3 PASSED lengkap dengan vote 3 juri.
- Verdicts vow-4: chip EXECUTED, tabel vote reject/approve/reject,
  tautan 3 laporan juri tampil; file laporannya sendiri menjawab
  HTTP 200.

## Yang belum terverifikasi, dikatakan apa adanya

- Alur tulis lewat wallet (connect, seal, submit proof dari browser)
  belum diklik sampai selesai karena butuh login wallet manusia;
  method yang sama persis sudah terbukti di chain lewat CLI dan
  swarm agent. Yang diverifikasi di browser adalah seluruh jalur
  baca dan logika notary/hash di sisi klien.
