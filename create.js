const { ethers } = require("ethers");
const fs = require("fs");

// Fungsi untuk membuat wallet baru
function generateWallet() {
  // Membuat wallet baru
  const wallet = ethers.Wallet.createRandom();

  // Menyiapkan objek dengan format yang diinginkan
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    phrase: wallet.mnemonic.phrase,
  };
}

// Fungsi untuk membuat beberapa wallet
function generateMultipleWallets(numberOfWallets) {
  const wallets = [];

  // Membuat wallet sesuai dengan jumlah yang diinginkan
  for (let i = 0; i < numberOfWallets; i++) {
    wallets.push(generateWallet());
  }

  // Menyimpan wallets ke dalam file wallets.json
  fs.readFile('wallets.json', 'utf8', (err, data) => {
    let existingWallets = [];

    // Jika file wallets.json sudah ada dan berisi data
    if (!err) {
      existingWallets = JSON.parse(data);
    }

    // Menambahkan wallets baru ke dalam array existingWallets
    existingWallets = existingWallets.concat(wallets);

    // Menyimpan array wallets yang diperbarui ke dalam file wallets.json
    fs.writeFile('wallets.json', JSON.stringify(existingWallets, null, 2), 'utf8', (err) => {
      if (err) {
        console.error("Error writing to wallets.json", err);
      } else {
        console.log(`${numberOfWallets} wallet berhasil disimpan di wallets.json`);
      }
    });
  });
}

// Meminta input dari pengguna untuk jumlah wallet yang ingin dibuat
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Menanyakan jumlah wallet yang ingin dibuat
rl.question("Berapa banyak wallet yang ingin dibuat? ", (answer) => {
  const numberOfWallets = parseInt(answer, 10);

  // Pastikan inputnya adalah angka dan lebih besar dari 0
  if (isNaN(numberOfWallets) || numberOfWallets <= 0) {
    console.log("Input tidak valid. Masukkan angka yang lebih besar dari 0.");
  } else {
    // Menjalankan fungsi untuk membuat beberapa wallet
    generateMultipleWallets(numberOfWallets);
  }

  rl.close();
});
