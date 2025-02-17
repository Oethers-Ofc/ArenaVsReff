require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const { ethers } = require('ethers');
const readline = require('readline-sync');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Load daftar wallet dari wallets.json
const wallets = JSON.parse(fs.readFileSync('wallets.json', 'utf8'));

// Load proxy list dari proxy.txt jika ada
const proxies = fs.existsSync('proxy.txt')
    ? fs.readFileSync('proxy.txt', 'utf8').split('\n').map(p => p.trim()).filter(p => p)
    : [];

// Tanya jumlah referral yang ingin dibuat
const maxRefs = readline.questionInt("Mau berapa reff? ");

// Tanya apakah ingin pakai proxy
const useProxy = readline.question("Pakai proxy? (y/n) ").toLowerCase() === 'y';

// Tanya kode referral
const REFERRAL_CODE = readline.question("Masukkan kode reff: ").trim();

// Konfigurasi request dasar
const baseHeaders = {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://quest.arenavs.com',
    'referer': 'https://quest.arenavs.com/',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
};

// Fungsi untuk mendapatkan proxy secara bergantian
let proxyIndex = 0;
function getProxy() {
    if (!useProxy || proxies.length === 0) return null;
    const proxy = `http://${proxies[proxyIndex]}`; // Format ip:port
    proxyIndex = (proxyIndex + 1) % proxies.length; // Rotasi proxy
    return proxy;
}

// Fungsi untuk mendapatkan IP publik
async function getPublicIP(proxy) {
    try {
        const config = { timeout: 5000 };
        if (proxy) config.httpsAgent = new HttpsProxyAgent(proxy);
        const res = await axios.get('https://api.ipify.org?format=json', config);
        return res.data.ip;
    } catch (error) {
        return 'Gagal mendapatkan IP';
    }
}

// Fungsi untuk sign wallet
async function signWallet(privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey);
        const message = `Sign this message to verify your wallet on ArenaVS`;
        return await wallet.signMessage(message);
    } catch (error) {
        console.error(`❌ Gagal sign wallet`, error.message);
        return null;
    }
}

// Fungsi untuk menunggu delay sebelum request selanjutnya
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fungsi untuk menyelesaikan semua task setelah registrasi
async function completeTasks(userId, token, proxy) {
    const tasks = [1, 2, 3];
    let taskResults = [];

    for (let task of tasks) {
        try {
            const axiosConfig = {
                headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
                httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined
            };

            await axios.post(`https://quest-api.arenavs.com/api/v1/tasks/${task}/complete/${userId}`, {}, axiosConfig);
            taskResults.push(`✅ Task ${task}: Berhasil`);
        } catch (error) {
            taskResults.push(`❌ Task ${task}: Gagal`);
        }

        // Tunggu 3-5 detik sebelum request task berikutnya
        await sleep(Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000);
    }

    return taskResults;
}

// Fungsi untuk registrasi dan memasukkan referral
async function registerAndRefer(wallet) {
    try {
        const signature = await signWallet(wallet.privateKey);
        if (!signature) return;

        // Ambil proxy
        const proxy = getProxy();

        // Dapatkan IP sebelum registrasi
        const publicIP = await getPublicIP(proxy);

        // Konfigurasi request dengan proxy
        const axiosConfig = {
            headers: baseHeaders,
            httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined
        };

        // Request registrasi
        const response = await axios.post(
            'https://quest-api.arenavs.com/api/v1/users/initialize',
            { walletAddress: wallet.address, referralCode: REFERRAL_CODE, signature },
            axiosConfig
        );

        const user = response.data.user;
        const token = response.data.token;

        console.log("\n==============================");
        console.log(`IP: ${publicIP}`);
        console.log(`Wallet: ${wallet.address}`);
        console.log("Proses reff: ✅ Sukses");

        // Simpan hasil registrasi
        fs.appendFileSync('users.json', JSON.stringify({ wallet: wallet.address, user, token }, null, 2) + ',\n');

        // Tunggu sebelum menyelesaikan task
        await sleep(5000);

        // Selesaikan 3 task setelah registrasi
        const taskResults = await completeTasks(user.id, token, proxy);
        taskResults.forEach(res => console.log(res));

        // Delay acak sebelum request berikutnya (5 - 15 detik)
        const delay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
        console.log(`⏳ Menunggu ${delay / 1000} detik sebelum registrasi berikutnya...`);
        await sleep(delay);
    } catch (error) {
        console.log("\n==============================");
        console.log(`IP: ${await getPublicIP(getProxy())}`);
        console.log(`Wallet: ${wallet.address}`);
        console.log("Proses reff: ❌ Gagal");
        console.log(`Error: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
}

// Jalankan proses referral untuk jumlah yang diminta
(async () => {
    for (let i = 0; i < maxRefs && i < wallets.length; i++) {
        await registerAndRefer(wallets[i]);
    }
})();
