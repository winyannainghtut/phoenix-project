# The Phoenix Project - Burmese Translation & Reader

[![Deploy to GitHub Pages](https://github.com/winyannainghtut/phoenix-project/actions/workflows/deploy.yml/badge.svg)](https://github.com/winyannainghtut/phoenix-project/actions/workflows/deploy.yml)

တစ်နှစ်ကို ဒေါ်လာ ၄ ဘီလီယံဖိုးလောက် ထုတ်လုပ်ရောင်းချနေတဲ့ **Parts Unlimited** ကုမ္ပဏီရဲ့ IT ဌာနမှာ ကြုံတွေ့ရတဲ့ စိန်ခေါ်မှုတွေ၊ DevOps ရဲ့ အနှစ်သာရတွေနဲ့ စီးပွားရေးလောကရဲ့ အလှည့်အပြောင်းတွေကို ရင်ခုန်စိတ်လှုပ်ရှားဖွယ် ဖတ်ရှုရမယ့် **"The Phoenix Project"** စာအုပ်၏ မြန်မာဘာသာပြန် စုစည်းမှု ဖြစ်ပါသည်။

## 📖 Features (အဓိက ပါဝင်သည့် အချက်များ)

- **Full Burmese Translation**: အခန်း ၁ မှ ၃၅ အထိနှင့် ရင်းမြစ် လမ်းညွှန် (Resource Guide) တို့ကို ပြည့်စုံစွာ ဘာသာပြန်ဆိုထားပါသည်။
- **Premium Reader UI**: "Phoenix Theme" (Dark mode with Sunset Orange/Red) ကို အသုံးပြုထားပြီး ဖတ်ရှုရ လွယ်ကူစေရန် glassmorphism ဒီဇိုင်းဖြင့် တည်ဆောက်ထားပါသည်။
- **Mobile-Friendly**: စမတ်ဖုန်းများတွင် အဆင်ပြေစွာ ဖတ်ရှုနိုင်ရန် Table of Contents (မာတိကာ) နှင့် Navigation controls များ ထည့်သွင်းထားပါသည်။
- **Automated Deployment**: GitHub Actions ကို အသုံးပြု၍ GitHub Pages ပေါ်တွင် အလိုအလျောက် host လုပ်ထားပါသည်။

---

## 📂 Directory Structure (ဖိုင်တွဲ တည်ဆောက်ပုံ)

```text
.
├── .github/workflows/    # CI/CD: Auto-deploy to GitHub Pages
├── book-reader/          # Web application source code (Vite + Vanilla JS)
│   ├── src/              # Logic for Markdown rendering
│   ├── public/           # Static assets (Chapters index & content)
│   └── vite.config.js    # Build configuration
├── burmese/              # Raw Burmese Markdown chapters (အခန်းသီးသန့် စုစည်းမှု)
└── english/              # Raw English Markdown chapters (မူရင်း အင်္ဂလိပ် စာသားများ)
```

---

## 🛠️ Technology Stack (နည်းပညာများ)

- **Frontend**: Vite + Vanilla JavaScript
- **Markdown Rendering**: [marked](https://github.com/markedjs/marked)
- **Styling**: Vanilla CSS (Modern CSS variables, Glassmorphism, Responsive Grid)
- **Deployment**: [GitHub Actions](https://github.com/features/actions)

---

## 🚀 Local Development (စမ်းသပ်အသုံးပြုရန်)

သင်၏ စက်ထဲတွင် စမ်းသပ်လိုပါက အောက်ပါအတိုင်း လုပ်ဆောင်နိုင်သည်-

```bash
# Clone the repository
git clone git@github.com:winyannainghtut/phoenix-project.git

# Navigate to the reader folder
cd book-reader

# Install dependencies
npm install

# Run the development server
npm run dev
```

---

## 📜 License

ဤဘာသာပြန်ဆိုမှုသည် ပညာရေးဆိုင်ရာနှင့် ဗဟုသုတ ဝေမျှရန် ရည်ရွယ်ချက်သက်သက်ဖြင့်သာ ဖြစ်ပါသည်။

> "IT ကို ထိထိရောက်ရောက် စီမံခန့်ခွဲနိုင်ဖို့ ဆိုတာဟာ အရေးကြီးတဲ့ အရည်အချင်း တစ်ခုတင် မကဘဲ ကုမ္ပဏီရဲ့ စွမ်းဆောင်ရည်ကို ကြိုတင် ခန့်မှန်းပေးနိုင်တဲ့ အချက်ပဲ ဖြစ်တယ်" — *Erik (The Phoenix Project)*

---
**Created by Antigravity**
