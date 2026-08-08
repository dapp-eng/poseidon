<div align="center">

# POSEIDON: Sistem Intelligence dan Prioritisasi Patroli IUU Fishing WPPNRI 711

*Maritime Domain Awareness 4 Dimensi Berbasis Radar Satelit Sentinel 1 dan Hybrid nnPU Stacking Ensemble*

[![Website Live Demo](https://img.shields.io/badge/Website-Live%20Demo-0070f3?style=for-the-badge&logo=netlify&logoColor=white)](https://poseidon-website.netlify.app)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Models%20%26%20Data-FFD21E?style=for-the-badge)](https://huggingface.co/JullMol/POSEIDON)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

[Akses Live Web Dashboard](https://poseidon-website.netlify.app) | [Repositori Hugging Face](https://huggingface.co/JullMol/POSEIDON)

</div>

---

## Ringkasan

POSEIDON (Platform Optimization for Surveillance and Enforcement Interception against Dark Vessel Operation Networks) merupakan sistem kecerdasan buatan (AI) dan intelijen maritim yang dirancang untuk menyusun prioritas patroli penanggulangan Illegal, Unreported, and Unregulated (IUU) Fishing di Wilayah Pengelolaan Perikanan Negara Republik Indonesia 711 (WPPNRI 711), yang mencakup Perairan Laut Natuna Utara, Selat Karimata, dan Laut China Selatan.

Tantangan utama penegakan hukum laut adalah keberadaan *dark vessel*, yaitu kapal perikanan ilegal yang secara sengaja mematikan transponder Automatic Identification System (AIS) untuk menghindari pelacakan.

Untuk mengatasi permasalahan tersebut, POSEIDON memadukan tiga komponen utama:
1. Deteksi citra satelit radar Synthetic Aperture Radar (SAR) Sentinel 1 dari Global Fishing Watch dan Google Earth Engine API.
2. Formulasi machine learning Non-negative Positive Unlabeled (nnPU) Learning berbasis arsitektur Hybrid Stacking Ensemble (LightGBM dan XGBoost).
3. Kalibrasi Conformal Prediction untuk menjamin tingkat kepercayaan statistik pada rekomendasi prioritas patroli maritim.

---

## Ringkasan Statistik dan Performa Sistem

Berikut adalah data aktual dan metrik evaluasi hasil pengujian model POSEIDON:

| Parameter Metrik | Nilai Aktual | Keterangan |
| :--- | :--- | :--- |
| Rentang Waktu Data | 2023–2025 | Pengamatan citra satelit SAR Sentinel 1 |
| Total Deteksi Satelit | 151.851 | Titik deteksi kapal di WPPNRI 711 |
| Jumlah Siklus Perlintasan Satelit | 570 | Siklus pass pengamatan satelit |
| Sampel Terlabel Positive (P) | 36 | Kejadian penangkapan kapal ilegal terverifikasi |
| Sampel Reliable Negative (RN) | 23.434 | Kapal niaga legal terverifikasi |
| Sampel Unlabeled (U) | 128.381 | Populasi deteksi tak berlabel |
| Estimasi Class Prior ($\pi$) | 0,001534 | ~0,153% estimasi proporsi kapal IUU |
| Model AUC ROC | 0,9032 | Performa pemodelan POSEIDON |
| Model AUPRC | 0,0205 | Peningkatan Lift 73,09x dibanding baseline (0,00028) |
| Conformal Coverage Rate | 83,33% | Hasil uji holdout test set ($\alpha = 0,10$) |

---

## Evaluasi Komparatif Model

Hasil pengujian performa POSEIDON dibandingkan terhadap 4 model baseline pada dataset WPPNRI 711:

| Arsitektur Model | AUC ROC | AUPRC | Lift Factor | Alert Efficiency (Top 10 per siklus) |
| :--- | :--- | :--- | :--- | :--- |
| Naive AIS Detection | 0,5163 | 0,0003 | 1,07x | 0,0278 |
| GFW Fishing Score Only | 0,5134 | 0,0003 | 1,00x | 0,0556 |
| Supervised LightGBM (Tanpa PU) | 0,7625 | 0,0017 | 6,07x | 0,0833 |
| AIS+SAR Stacking Baseline | 0,6971 | 0,0042 | 15,06x | 0,1389 |
| **POSEIDON (Hybrid nnPU Stacking)** | **0,9032** | **0,0205** | **73,09x** | **0,2222** |

---

## Arsitektur 4 Dimensi Maritime Domain Awareness (4D MDA)

POSEIDON mengekstraksi 18 fitur yang dikelompokkan ke dalam 4 dimensi intelijen maritim:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DETEKSI SATELIT RADAR SENTINEL 1                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌─────────────────┬─────────────┴─────────────┬─────────────────┐
    ▼                 ▼                           ▼                 ▼
┌──────────────┐  ┌──────────────┐          ┌──────────────┐  ┌──────────────┐
│  DIMENSI A   │  │  DIMENSI B   │          │  DIMENSI C   │  │  DIMENSI D   │
│ Metrik Fisik │  │   Konteks    │          │ Korelasi AIS │  │ Inteligensi  │
│   & Radar    │  │  Geospasial  │          │  & Perilaku  │  │  Temporal    │
└──────┬───────┘  └──────┬───────┘          └──────┬───────┘  └──────┬───────┘
       │                 │                         │                 │
       └─────────────────┴────────────┬────────────┴─────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   MATRIKS INTEGRASI 4D (18 FITUR)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               MODEL HYBRID nnPU STACKING ENSEMBLE                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Panduan Eksekusi Notebook Pipeline & Simulasi Lokal

Folder `pipeline/` berisi 5 notebook Jupyter yang tersusun secara berurutan dari Phase 0 hingga Pipeline Final:

### 1. `POSEIDON_Phase0_Length_Regression.ipynb`
* Deskripsi: Membangun model regresi statistik untuk memprediksi panjang kapal (Length overall dalam meter) berdasarkan Gross Tonnage (GT).
* Prasyarat: Kredensial GFW API dan dataset EU Fleet Register.
* Pemilihan Model: Diuji Regresi Linear, Power Law Log Log, dan Polinomial. Model Power Law Log Log dipilih karena stabilitas ekstrapolasi fisik kapal:
  $$\text{Length} = 5,7251 \times \text{GT}^{0,3088} \quad (R^2 = 0,9491 \text{ full dataset}, R^2 = 0,8458 \text{ test set})$$
* Hasil Output: Berkas model `length_regression_model.joblib`.

### 2. `POSEIDON_Phase1_Load_Filter_GFW_SAR_WPP711.ipynb`
* Deskripsi: Memuat dan menyaring data deteksi radar SAR Sentinel 1 GFW khusus untuk koordinat WPPNRI 711 periode 2023–2025.
* Hasil Output: Berkas dataset `gfw_sar_wpp711_2023_2025.parquet`.

### 3. `POSEIDON_Phase2_SAR_Feature_Extraction_GEE.ipynb`
* Deskripsi: Mengesktrak nilai intensitas radar SAR Sentinel 1 GRD (`COPERNICUS/S1_GRD`) secara otomatis dari Google Earth Engine API pada setiap titik deteksi.
* Hasil Output: Berkas dataset `sar_wpp711_with_gee_features.parquet`.

### 4. `POSEIDON_Phase3_Integrasi_4_Dimensi.ipynb`
* Deskripsi: Mengintegrasikan seluruh fitur dari 4 Dimensi MDA menggunakan perhitungan Haversine distance dan spatial join GeoPandas.
* Hasil Output: Berkas dataset terintegrasi `POSEIDON_WPP711_complete.csv`.

### 5. `POSEIDON_Pipeline_Final.ipynb`
* Deskripsi: Pelatihan model utama kecerdasan buatan POSEIDON, kalibrasi Conformal Prediction, evaluasi komparatif, dan ekspor data JSON.
* Hasil Output: Seluruh berkas JSON pada folder `data/`.

---

## Akses Web Dashboard Operasional

Platform POSEIDON dirancang untuk dikembangkan lebih jauh menuju skala produksi dengan sistem otomatisasi pemrosesan data maritim secara *real-time*. Sebagai kesiapan arsitektur masa depan, **logika privasi data, autentikasi terenkripsi, serta pembatasan akses data terproteksi sudah terpasang dan terintegrasi penuh pada platform ini**.

Pada tahap prototipe dan simulasi operasional saat ini, berkas data pada folder `data/` (kecuali data GeoJSON WPP711) sengaja tidak disertakan dalam repositori publik untuk menjaga integritas data.

Untuk mencoba dan mengakses langsung simulasi antarmuka web dashboard POSEIDON, silakan gunakan tautan berikut:

👉 **[Akses POSEIDON Live Web Dashboard](https://poseidon-website.netlify.app)**

### Kredensial Mode Simulasi (2023–2025)
Untuk keperluan pengujian, demo, dan evaluasi historis, gunakan akun simulasi bawaan berikut pada dialog login web dashboard:
* **Username**: `simulasi`
* **Password**: `simulasi123`

Saat berhasil masuk menggunakan akun `simulasi`, sistem secara otomatis mengunci pemuatan data ke dataset simulasi historis periode **2023–2025**, sesuai dengan output notebook saat ini. Pengaturan ini juga akan berlaku otomatis saat platform terhubung ke pipeline otomatis di masa mendatang.

---

## Fitur Modul Utama Web Dashboard

Antarmuka web POSEIDON terbagi menjadi 4 tampilan modul utama:

1. **View Platform**: Halaman utama yang menyajikan penjelasan arsitektur sistem POSEIDON, formulasi 4 Dimensi MDA, serta penjelasan teknis nnPU Learning.
2. **View Dashboard** *(Terproteksi)*: Peta spasial-temporal interaktif WPPNRI 711 berbasis Leaflet JS untuk memantau sebaran deteksi satelit, filter tanggal perlintasan, heatmap risiko, serta pemilahan status kapal tanpa AIS dan kapal teridentifikasi.
3. **View Operasi** *(Terproteksi)*: Panel taktis operasional yang menyajikan daftar 10 kapal prioritas tertinggi (*Top 10 Priority Patrol List*) untuk setiap siklus pengamatan satelit, dilengkapi indikator siaga operasional (SIAGA 1, SIAGA 2, SIAGA 3), estimasi dimensi fisik kapal, serta koordinat penindakan patroli.
4. **View Statistik**: Panel transparansi performa model yang menampilkan grafik AUC ROC, AUPRC, perbandingan kurva Precision Recall terhadap 4 model baseline, analisis Conformal Prediction, kontribusi fitur, serta analisis ablasi.

---

## Repositori Model dan Dataset Hugging Face

Seluruh bobot model kecerdasan buatan dan data tertentu dapat diakses pada repositori Hugging Face berikut:

https://huggingface.co/JullMol/POSEIDON

---

## Struktur Direktori Proyek

```
poseidon_web/
│
├── index.html                 Halaman utama antarmuka web dashboard
├── styles.css                 Berkas gaya visual CSS dan sistem tema
├── app.js                     Logika utama aplikasi web dan manajemen autentikasi
├── ocean.js                   Visualisasi efek animasi latar belakang lautan
├── dashboard_bg.js            Komponen animasi canvas latar belakang dashboard
├── operasi_bg.js              Komponen animasi canvas latar belakang operasi
├── statistik_bg.js            Komponen visualisasi grafik dan metrik evaluasi
├── netlify.toml               Konfigurasi build dan pengalihan API Netlify
├── .env.example               Templat konfigurasi variabel lingkungan lokal
├── README.md                  Dokumentasi resmi proyek POSEIDON
│
├── netlify/
│   └── functions/             Fungsi serverless terproteksi
│       ├── login.js           Handler autentikasi login dan pembuatan token sesi
│       └── data.js            Proxy pengambilan data JSON terproteksi
│
├── pipeline/                  Folder notebook Jupyter eksperimen dan pipeline AI
│   ├── POSEIDON_Phase0_Length_Regression.ipynb
│   ├── POSEIDON_Phase1_Load_Filter_GFW_SAR_WPP711.ipynb
│   ├── POSEIDON_Phase2_SAR_Feature_Extraction_GEE.ipynb
│   ├── POSEIDON_Phase3_Integrasi_4_Dimensi.ipynb
│   └── POSEIDON_Pipeline_Final.ipynb
│
└── data/                      Folder data JSON aplikasi web (hanya berisi file GeoJSON WPP711 di repository ini)
```

---

<div align="center">

POSEIDON: Sistem Intelligence dan Prioritisasi Patroli IUU Fishing WPPNRI 711

</div>
