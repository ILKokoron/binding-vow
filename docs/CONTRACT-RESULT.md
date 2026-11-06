# Kontrak Binding Vow: SELESAI dan terbukti live (2026-11-06)

Kontrak final live di testnet:
**bindingvow.bindingvow1106.testnet**
Owner: bindingvow1106.testnet. Juri: judge1, judge2, judge3
(masing-masing subaccount bindingvow1106.testnet).
Kode: ~/workspace/binding-vow/contract-vow/src/lib.rs, wasm 179.783 byte.

## Yang diimplementasikan

- create_vow: kunci stake + fee (deposit harus persis stake + fee),
  mint NFT sumpah, deadline, jendela vonis, jendela batal, tujuan
  hangus pilihan user (akun bernama atau alamat bakar implisit nol).
- cancel_vow: keputusan kokoron 2026-11-06, jendela batal singkat.
  Di dalam jendela dan sebelum bukti dikirim, owner bisa batal:
  stake + fee kembali utuh, NFT terbakar. Kirim bukti menyegel
  sumpah lebih awal.
- submit_proof, commit_vote dan reveal_vote (commit-reveal,
  hash sha256 "approve:salt"), finalize (mayoritas dari yang reveal;
  fee dibagi rata ke juri yang reveal apapun vonisnya; kalau tidak
  ada juri yang reveal sama sekali vonis gagal dan fee kembali ke
  owner), redeem (lulus: bakar NFT, stake kembali utuh), execute
  (gagal atau tidak ada bukti lewat deadline: bakar NFT, stake
  hangus ke tujuan pilihan; fee kembali ke owner kalau tidak pernah
  ada penjurian).
- Aturan tiga pot ditegakkan di kode: stake tidak pernah membayar
  juri; fee terpisah dan lunas apapun vonisnya.
- NFT: view mengikuti NEP-171 (nft_token, nft_tokens_for_owner,
  nft_total_supply, nft_supply_for_owner, nft_metadata), dan
  nft_transfer / nft_transfer_call selalu panic "Binding Vow NFTs
  are non-transferable" sesudah cek deposit 1 yocto standar.

## Bukti live di deployment final

- Alur lulus: create vow-0 (tx BYB7RzuHPjjm1YBuZ9x4cQAXn7ypWd7
  oShCGK3t9PTyp), bukti masuk (tx GLV66Zj6ZAEnHvCCEmSEaPxarGHV
  YTQPEZ4R8PUVCzEQ), vote 2-1, finalize (tx 5k3k7SGR1hftdReifm1C
  cnmFCs4KzbwvvrXDJ8pD18Jb) status "passed" dan fee_settled true,
  saldo judge1 naik persis 0.01 NEAR (0.209232 ke 0.219232, fee
  0.03 dibagi 3), redeem (tx F1RxfSVgH45VUnkvYYwadXXi4Zyu5iDb
  j97962HLwLL5), nft_token vow-0 = null.
- Batal dalam jendela: vow-1 create (tx ErQsnUvJtH3eFYfmyhpceTDV
  5fDf1dFHSab32pM66hgb), cancel (tx AFycePyhie5n2t5s5Y9yt5DrdLf
  1btAD8drV761AjkfY), status "cancelled", burned true.
- Batal telat: vow-2 jendela 1 detik, cancel sesudahnya panic
  "cancellation window has closed". vow-2 tetap active, supply 1.
- Soulbound: nft_transfer ke vow-2 panic persis "Binding Vow NFTs
  are non-transferable", owner token tidak berubah.
- Unit test: 12 dari 12 lulus (buat, deposit salah, lulus-tebus,
  gagal-eksekusi, timeout tanpa bukti, bukti telat, bukan juri,
  reveal tidak cocok, transfer panic, batal dalam jendela, batal
  telat, batal sesudah bukti).

## Dua insiden, dicatat jujur

1. Redeploy dengan init call TIDAK mereset state yang sudah ada.
   Tiga deployment awal menumpuk di akun vow.bindingvow1106.testnet
   sampai state-nya campuran tiga generasi kode. Pelajaran: verifikasi
   state sesudah deploy, jangan percaya tulisan "successfully".
2. Saat membersihkan akun campuran itu, perintah hapus akun gagal
   (sintaks subcommand beneficiary), tetapi penghapusan file kunci
   lokal di perintah yang sama tetap jalan. Akun
   vow.bindingvow1106.testnet (3.23 NEAR testnet) kehilangan kunci
   lokalnya dan tidak bisa dipakai lagi. Uang testnet saja, tidak
   ada dana asli. Kontrak final pindah ke subaccount baru
   bindingvow.bindingvow1106.testnet dan seluruh suite bukti di atas
   dijalankan bersih di sana. Pelajaran: jangan pernah menghapus
   file kredensial dalam satu rangkaian perintah dengan operasi akun
   yang belum terverifikasi hasilnya.

## Berikutnya

Swarm agent: notaris yang mengubah todo kabur jadi syarat bukti
konkret, checker deterministik, dan juri yang commit-reveal lewat
akun judge1 sampai judge3. Lalu frontend 4 layar.
