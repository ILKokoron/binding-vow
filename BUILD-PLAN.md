# Binding Vow: rencana bangun dan daftar kebutuhan

Mulai: 2026-11-06 15:57 WIB, atas perintah kokoron: gas, jangan tunda lagi.
Brief desain: ~/workspace/goals/near-hackathon-entry/files/BRIEF-BINDING-VOW.md
Deadline submit: Sabtu 14 Nov 2026 23:59 UTC = Minggu 15 Nov 06:59 WIB.
Track yang dicentang: NFTs That Do Something (utama), AI Swarms (utama),
Agent Economy (pelengkap).

## Urutan bangun

1. Spike hari 1 (penentu): toolchain Rust plus wasm32, deploy kontrak
   hello-world ke NEAR testnet dari akun dev, panggil satu method dari CLI.
   Tembus = lanjut. Nyangkut = lapor apa adanya hari ini juga.
2. Kontrak sumpah (satu kontrak): kunci stake, kunci fee swarm terpisah,
   NFT sumpah non-transferable, deadline, kirim bukti, vonis, burn tebus,
   burn eksekusi. Unit test buat semua alur.
3. Swarm: agent notaris (merumuskan syarat bukti dari to do mentah),
   pemeriksa deterministik (link hidup, hash cocok, waktu sebelum
   deadline), agent juri (nyocokin bukti ke syarat, voting commit-reveal).
4. Frontend: buat sumpah, lihat sumpah, kirim bukti, halaman vonis.
   Satu kategori tugas saja: tugas digital.
5. Demo dua babak: satu sumpah berhasil ditebus, satu gagal dieksekusi,
   deadline demo dipersingkat ke menit.
6. README yang bisa diikuti orang lain, video demo, post X, submit.

## Yang perlu disiapkan (inventaris)

Dari Asa, dikerjakan sendiri:
- Toolchain: rustup plus target wasm32-unknown-unknown (lagi diinstall),
  cargo-near dan near-cli versi binary jadi biar hemat RAM VM.
- Akun dev testnet project (dibuat lewat CLI, khusus project ini, bukan
  wallet pribadi kokoron), didanai faucet testnet.
- Wallet testnet buat 5 agent swarm dan 1 wallet user demo.
- Repo GitHub public di bawah akun kokoron (ILKokoron) pas waktunya rilis.
- Semua kode: kontrak, agent, frontend, test.

Dari kokoron, TIDAK ada yang menghalangi langkah hari ini. Yang perlu
nanti saja:
- Satu akun mainnet NEAR kosong, cuma buat alamat payout di form
  submission. Tidak perlu diisi dana, tidak ada deploy mainnet.
- Keputusan jiwa produk dari brief: klausul ampun ada atau tidak ada,
  dan tujuan hangus bawaan (burn atau pool komunitas).
- Nama project final, menyusul sebelum README dan post X.
- Post demo di akun X-nya sendiri pas hari demo.

## Batasan yang sudah dikunci

- Testnet saja. Tidak ada mainnet deploy, tidak ada uang beneran.
- Satu kategori tugas: digital. Satu kontrak. Tidak ada coin sendiri.
- Stake demo pakai NEAR testnet. USDC adalah catatan versi produksi.
- Fee swarm terpisah dari stake, cair mau vonis apa pun. Stake tidak
  pernah membayar juri.
- RAM VM pas-pasan (sekitar 7,7 GB, tanpa swap tambahan yang bisa
  dipasang): compile dibatasi job paralelnya dan pakai binary jadi
  sebisa mungkin.
