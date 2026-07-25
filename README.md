# 🔥 MapleStory M Probability Calculator

A static web calculator that computes the exact probability and expected rolls to hit target **Potential**, **Bonus Potential**, and **Rebirth Flame** stat combinations in MapleStory M — powered by live probability data scraped directly from Nexon's official odds page.

> **[🚀 Live Demo →](https://jasonwliu.github.io/msm_cube_flame_probabilities/)**

---

## ✨ Features

| Feature | Description |
|---|---|
| **Three Calculators** | Potentials, Bonus Potentials, and Rebirth Flames — each with tailored UI controls |
| **Live Nexon Data** | Probability tables scraped weekly from Nexon's official disclosure page via GitHub Actions |
| **Percentile Estimates** | See rolls needed for the Median (50%), 75th, 85th, and 95th percentiles |
| **Cost Estimator** | Calculates and displays Meso (regular potentials) and Crystal cost estimates directly inside each percentile card based on target rolls (supports custom Meso inputs in millions) |
| **Impossible Combo Detection** | Warns you if your selected stat combination can't physically roll on the item |
| **Stat Value Guide** | Reference table showing 1L Max, 2L Max, and 3L Max values for each potential stat, optimized to prevent horizontal scrolling |
| **Scaling Flame Stats** | Supports generic "scales with X" flame options alongside discrete stat lines |
| **Zero Dependencies** | Pure HTML + CSS + JS — no frameworks, no build step, instant load |

## 📸 Screenshots

<!-- Replace with actual screenshot paths after deploying -->
<!-- ![Calculator Screenshot](docs/screenshot.png) -->

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Custom dark-mode glassmorphic design with CSS variables
- **Font**: [Outfit](https://fonts.google.com/specimen/Outfit) via Google Fonts
- **Data Pipeline**: Python scraper (`scripts/scrape_odds.py`) + validator (`scripts/validate_data.py`)
- **CI/CD**: GitHub Actions for weekly data refresh + GitHub Pages for hosting

---

## 📁 Project Structure

```
cube_flame_odds/
├── index.html              # Main application page
├── styles.css              # All styling (dark mode, glassmorphism, animations)
├── app.js                  # Application logic, probability engine, UI rendering
├── data/
│   └── probabilities.json  # Scraped probability data (~1.9 MB)
├── scripts/
│   ├── scrape_odds.py      # Nexon probability page scraper
│   └── validate_data.py    # Data integrity validator
├── .github/
│   └── workflows/
│       ├── scrape.yml      # Weekly data refresh pipeline
│       └── deploy.yml      # GitHub Pages deployment
└── README.md
```

---

## 🚀 Local Development

No build tools required — just serve the files:

```bash
# Clone the repo
git clone https://github.com/jasonwliu/msm_cube_flame_probabilities.git
cd msm_cube_flame_probabilities


# Serve locally (Python 3)
python -m http.server 8000

# Open http://localhost:8000
```

---

## 📊 Data Pipeline

Probability data is scraped from [Nexon's official probability disclosure page](https://m.nexon.com/probability?client_id=MTY3MDg3NDAy&language=en) and stored in `data/probabilities.json`.

### Automated Refresh

The **Scheduled Scraper Pipeline** (`.github/workflows/scrape.yml`) runs every Thursday at 00:00 UTC:

1. Scrapes all equipment types, tiers, and stat options from Nexon
2. Validates the scraped data for completeness
3. Auto-commits any changes to `data/probabilities.json`

You can also trigger it manually from the **Actions** tab.

### Manual Scrape

```bash
# Install dependencies (standard library only — no pip install needed)
python scripts/scrape_odds.py

# Validate the output
python scripts/validate_data.py
```

---

## 🌐 Deployment (GitHub Pages)

The site auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.

### First-Time Setup

1. Go to **Settings → Pages** in your GitHub repo
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the workflow handles the rest

---

## 🧮 How the Math Works

For a given set of target stats, the calculator computes the probability that a single roll satisfies **all** targets simultaneously (AND logic). It then uses the [Geometric distribution](https://en.wikipedia.org/wiki/Geometric_distribution) to estimate how many rolls are needed to reach various confidence levels:

$$n = \left\lceil \frac{\ln(1 - \text{percentile})}{\ln(1 - p)} \right\rceil$$

Where *p* is the per-roll success probability and *n* is the number of rolls needed.

**Potentials** enumerate all possible line combinations (first-line pool × second/third-line pool) and count how many satisfy the target thresholds. **Rebirth Flames** use a similar combinatorial approach over the flame line pools.

---

## 📝 License

This project is not affiliated with Nexon. Probability data is sourced from Nexon's publicly available disclosure page. Use calculations as general guidance — actual rolls depend on RNG.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or pull requests for:

- Bug fixes or calculation corrections
- New equipment types or stat categories
- UI/UX improvements
- Mobile responsiveness enhancements
