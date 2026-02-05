# ⚡ Electric Blue - Waysocket Baileys

<p align="center">
  <img src="https://i.postimg.cc/vH02735L/profile.jpg" alt="Electric Blue Logo" width="200" />
</p>

<p align="center">
  <strong>🔌 WhatsApp WebSocket Library by Electric Blue Team</strong>
</p>

<p align="center">
  <em>"Success is not final, failure is not fatal: it is the courage to continue that counts."</em>
</p>

---

## 💡 About

**Electric Blue - Waysocket Baileys** adalah library open-source yang dirancang untuk membantu developer membangun solusi otomasi dan integrasi dengan WhatsApp secara efisien. Menggunakan teknologi websocket tanpa memerlukan browser, library ini mendukung berbagai fitur seperti manajemen pesan, penanganan chat, administrasi grup, serta pesan interaktif dan tombol aksi untuk pengalaman pengguna yang lebih dinamis.

Library ini dikembangkan dan dipelihara secara aktif oleh **Electric Blue Team**, terus menerima update untuk meningkatkan stabilitas dan performa. Salah satu fokus utama adalah meningkatkan proses pairing dan autentikasi agar lebih stabil dan aman.

---

## ✨ Fitur Utama

- ⚡ Mendukung proses pairing otomatis dan custom
- 🔧 Memperbaiki masalah pairing sebelumnya yang sering menyebabkan kegagalan
- 💬 Mendukung pesan interaktif, tombol aksi, dan menu dinamis
- 🔄 Manajemen sesi otomatis yang efisien
- 📱 Kompatibel dengan fitur multi-device terbaru WhatsApp
- 🪶 Ringan, stabil, dan mudah diintegrasikan
- 🤖 Cocok untuk bot, otomasi, dan solusi komunikasi lengkap
- 📚 Dokumentasi lengkap dan contoh kode

---

## 🚀 Getting Started

### Installation

```json
"dependencies": {
  "waysocket-baileys": "github:reys66223-art/Waysocket-Baileys"
}
```

### Import

```javascript
const {
  default: makeWASocket
} = require("waysocket-baileys");
```

---

## 📡 Cara Connect ke WhatsApp

### Dengan QR Code

```javascript
const client = makeWASocket({
  browser: ["Electric Blue", "Chrome", "20.0.0"],
  printQRInTerminal: true
});
```

### Connect Dengan Nomor

```javascript
const {
  default: makeWASocket,
  fetchLatestWAWebVersion
} = require("waysocket-baileys");

const client = makeWASocket({
  browser: ["Electric Blue", "Chrome", "20.0.0"],
  printQRInTerminal: false,
  version: fetchLatestWAWebVersion()
});

const number = "628XXXXXXXXX";
const code = await client.requestPairingCode(number.trim());

console.log("Pairing Code:", code);
```

---

## 📨 Sending Messages

### Send Order Message

```javascript
const fs = require('fs');
const nameImg = fs.readFileSync('./Image');

await client.sendMessage(m.chat, {
  thumbnail: nameImg,
  message: "Example order message",
  orderTitle: "Example Order",
  totalAmount1000: 8888,
  totalCurrencyCode: "IDR"
}, { quoted: m });
```

### Send Poll Result Message

```javascript
await client.sendMessage(m.chat, {
  pollResultMessage: {
    name: "Example Poll Result",
    options: [
      { optionName: "Option A" },
      { optionName: "Option B" }
    ],
    newsletter: {
      newsletterName: "Electric Blue Newsletter",
      newsletterJid: "1@newsletter"
    }
  }
});
```

### Send Product Message

```javascript
await client.relayMessage(m.chat, {
  productMessage: {
    title: "Example Product",
    description: "Product description example",
    thumbnail: { url: "./example.jpg" },
    productId: "PRODUCT_ID",
    retailerId: "RETAILER_ID",
    url: "https://example.com",
    body: "Product body text",
    footer: "Electric Blue",
    buttons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Open Link",
          url: "https://example.com"
        })
      }
    ],
    priceAmount1000: 50000,
    currencyCode: "IDR"
  }
});
```

---

## 🏆 Credits

```javascript
const credits = {
  project: "Electric Blue - Waysocket Baileys",
  author: "Electric Blue Team",
  repository: "github.com/reys66223-art/Waysocket-Baileys",
  motto: "Building the future, one line at a time ⚡"
};

module.exports = credits;
```

---

## 📜 License

MIT License - Feel free to use and modify!

---

<p align="center">
  <strong>⚡ Electric Blue Team ⚡</strong><br>
  <em>Innovate. Create. Electrify.</em>
</p>
