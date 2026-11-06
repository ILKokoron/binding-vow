# Spike hari 1: HASIL TEMBUS (2026-11-06)

Pertanyaan spike: bisa tidak Asa deploy kontrak NEAR ke testnet dan
memanggil method-nya, dari nol, di VM ini. Jawaban: bisa, terbukti
end-to-end sore yang sama dengan hari penguncian arah.

## Bukti

- Toolchain: rustc dan cargo 1.99.1, target wasm32-unknown-unknown,
  cargo-near 0.23.0 (binary resmi, sha256 terverifikasi), near-cli-rs
  0.31.1 (binary resmi, sha256 terverifikasi). Semua di home, aman dari
  penggantian VM.
- Compile kontrak hello-world: sukses 1 menit 41 detik, hasil
  binding_vow.wasm 56.3 KB plus ABI. RAM VM sempit diatasi dengan
  CARGO_BUILD_JOBS=2.
- Akun project testnet: bindingvow1106.testnet, dibuat lewat sponsor
  faucet (create tx 3hXgaBCjavFcAMtuzmAwX6JkYb6Rbzq7HFkpGJK5YWg8).
  Akun ini khusus project, bukan wallet pribadi kokoron. Dua keypair
  sisa percobaan yang gagal tidak dikenali chain dan sudah dipindah
  keluar dari folder kredensial aktif; satu-satunya kunci yang tersisa
  di sana adalah kunci full access yang cocok dengan yang tercatat
  di chain.
- Deploy: kontrak terdeploy ke bindingvow1106.testnet.
- Panggil method: set_greeting berhasil (tx
  4YXEjoS9XpVeTinuKBoSPXt71tTRYf6EUGtRjnE3zDLs), lalu get_greeting
  membaca balik "Sumpah pertama: spike tembus". Perubahan state
  terbukti di chain, bukan cuma di log lokal.

## Kejadian di tengah

- cargo near create-dev-account gagal karena butuh TTY. Jalur yang
  berhasil: near-cli sponsor-by-faucet-service.
- Pembuatan akun sempat tertahan dua kartu persetujuan berbagi info
  jaringan (helper.nearprotocol.com buat sponsor faucet, dan
  api.nearblocks.io). Kokoron approve, akun langsung jadi. Sesuai
  aturan tetapnya: setiap ada yang menunggu persetujuan, dia
  diberitahu saat itu juga.

## Berikutnya

Kontrak sumpah versi penuh menggantikan hello-world di akun yang sama:
kunci stake, kunci fee terpisah, NFT non-transferable, deadline,
kirim bukti, vonis swarm, burn tebus, burn eksekusi, plus unit test.
