"use strict";

// Attempt autoplay with sound; use a muted fallback when browser policy blocks it.
(() => {
  const video = document.querySelector(".hero-video");
  if (!video) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let playbackAttempt = 0;

  function syncPlayback() {
    const attempt = ++playbackAttempt;
    if (reducedMotion.matches || document.hidden) {
      video.pause();
      return;
    }

    video.muted = false;
    video.play().then(() => {
      if (attempt !== playbackAttempt) return;
      document.removeEventListener("click", enableAudio);
      document.removeEventListener("keydown", enableAudio);
    }).catch((error) => {
      if (attempt !== playbackAttempt || error.name !== "NotAllowedError") return;
      video.muted = true;
      video.play().catch(() => {
        // Keep the static Hero background if playback is unavailable.
      });
    });
  }

  function enableAudio(event) {
    if (!event.isTrusted) return;
    if (event.type === "keydown" && ["Shift", "Control", "Alt", "Meta", "Escape"].includes(event.key)) return;
    syncPlayback();
  }

  document.addEventListener("click", enableAudio);
  document.addEventListener("keydown", enableAudio);
  reducedMotion.addEventListener("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);
  syncPlayback();
})();

(() => {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-navigation");
  const menuLabel = document.querySelector(".menu-label");
  if (!toggle || !navigation || !menuLabel) return;

  const mobileLayout = window.matchMedia("(max-width: 1023px)");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? "Tutup menu navigasi" : "Buka menu navigasi";
    navigation.hidden = mobileLayout.matches && !open;
  }

  function syncLayout() {
    const focusWasInNavigation = navigation.contains(document.activeElement);
    const focusWasOnToggle = document.activeElement === toggle;
    toggle.hidden = !mobileLayout.matches;
    setMenu(false);
    if (mobileLayout.matches && focusWasInNavigation) toggle.focus();
    if (!mobileLayout.matches && focusWasOnToggle) navigation.querySelector("a").focus();
  }

  toggle.addEventListener("click", () => {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (mobileLayout.matches && link) {
      setMenu(false);
      if (link.hash && (!link.pathname || link.pathname === window.location.pathname)) {
        const target = document.getElementById(link.hash.slice(1));
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        } else {
          toggle.focus();
        }
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (mobileLayout.matches && !navigation.contains(event.target) && !toggle.contains(event.target)) {
      if (toggle.getAttribute("aria-expanded") === "true") {
        const focusWasInNavigation = navigation.contains(document.activeElement);
        setMenu(false);
        if (focusWasInNavigation) toggle.focus();
      }
    }
  });

  mobileLayout.addEventListener("change", syncLayout);
  syncLayout();
})();

// Dropdown menu interaction for "Tentang Kami" (Visi dan Misi, Tujuan Utama, Struktur Pengelola)
(() => {
  const dropdowns = document.querySelectorAll(".nav-dropdown");
  if (!dropdowns.length) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".dropdown-trigger");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (!trigger || !menu) return;

    let hoverTimeout;

    function openDropdown() {
      clearTimeout(hoverTimeout);
      trigger.setAttribute("aria-expanded", "true");
      dropdown.classList.add("is-open");
    }

    function closeDropdown() {
      clearTimeout(hoverTimeout);
      trigger.setAttribute("aria-expanded", "false");
      dropdown.classList.remove("is-open");
    }

    function toggleDropdown() {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleDropdown();
    });

    // Close dropdown when an item inside is clicked (e.g. on-page anchor link)
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        closeDropdown();
      }
    });

    dropdown.addEventListener("pointerenter", () => {
      if (canHover.matches) {
        openDropdown();
      }
    });

    dropdown.addEventListener("pointerleave", () => {
      if (canHover.matches) {
        hoverTimeout = setTimeout(closeDropdown, 200);
      }
    });

    dropdown.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (trigger.getAttribute("aria-expanded") === "true") {
          event.stopPropagation();
          closeDropdown();
          trigger.focus();
        }
      }
    });
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(event.target)) {
        const trigger = dropdown.querySelector(".dropdown-trigger");
        trigger?.setAttribute("aria-expanded", "false");
        dropdown.classList.remove("is-open");
      }
    });
  });
})();

// Accessible tabs: automatic activation with roving keyboard focus.
(() => {
  document.querySelectorAll("[data-tabs]").forEach((group) => {
    const tabs = Array.from(group.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    if (!tabs.length || panels.some((panel) => !panel || !group.contains(panel))) return;

    function activateTab(index, moveFocus = false) {
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[tabIndex].hidden = !selected;
      });
      if (moveFocus) tabs[index].focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateTab(index));
      tab.addEventListener("keydown", (event) => {
        let nextIndex;
        switch (event.key) {
          case "ArrowRight": nextIndex = (index + 1) % tabs.length; break;
          case "ArrowLeft": nextIndex = (index - 1 + tabs.length) % tabs.length; break;
          case "Home": nextIndex = 0; break;
          case "End": nextIndex = tabs.length - 1; break;
          case "Enter":
          case " ": nextIndex = index; break;
          default: return;
        }
        event.preventDefault();
        activateTab(nextIndex, true);
      });
    });

    function syncTabWithHash() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const targetIndex = tabs.findIndex(
        (tab, idx) => tab.id === hash || panels[idx]?.id === hash
      );
      if (targetIndex >= 0) {
        activateTab(targetIndex);
      }
    }

    window.addEventListener("hashchange", syncTabWithHash);
    const initialIndex = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    activateTab(initialIndex < 0 ? 0 : initialIndex);
    syncTabWithHash();
  });
})();

// Keep anchor offsets aligned with the rendered sticky header, including text zoom.
(() => {
  const header = document.querySelector(".site-header");
  if (header && "ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--scroll-header-height", `${header.getBoundingClientRect().height}px`);
    });
    observer.observe(header);
  }

  const links = document.querySelectorAll('.navigation a[href^="#"]');
  function updateCurrentLink() {
    const hash = window.location.hash || "#beranda";
    links.forEach((link) => {
      if (link.hash === hash) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", updateCurrentLink);
  updateCurrentLink();

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();


// Galeri Photo Filter & Lightbox Modal
(() => {
  const modal = document.getElementById("photo-lightbox");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const photoItems = Array.from(document.querySelectorAll(".photo-item"));

  // 1. Category Filtering
  if (filterButtons.length && photoItems.length) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter") || "all";

        filterButtons.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");

        photoItems.forEach((item) => {
          const cat = item.getAttribute("data-category");
          if (filter === "all" || cat === filter) {
            item.removeAttribute("hidden");
          } else {
            item.setAttribute("hidden", "");
          }
        });
      });
    });
  }

  // 2. Lightbox Modal
  if (!modal) return;

  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  const closeBtn = modal.querySelector(".lightbox-close");
  const backdrop = modal.querySelector(".lightbox-backdrop");
  const prevBtn = modal.querySelector(".lightbox-prev");
  const nextBtn = modal.querySelector(".lightbox-next");

  function getVisibleCards() {
    return Array.from(document.querySelectorAll(".photo-item:not([hidden]) .photo-card"));
  }

  let currentIndex = 0;
  let lastActiveElement = null;

  function showIndex(index) {
    const visibleCards = getVisibleCards();
    if (!visibleCards.length) return;
    currentIndex = (index + visibleCards.length) % visibleCards.length;
    const card = visibleCards[currentIndex];
    const fullSrc = card.getAttribute("data-full") || card.querySelector("img")?.src;
    const fullCaption = card.getAttribute("data-caption") || card.querySelector("img")?.alt || "";

    if (img) {
      img.src = fullSrc;
      img.alt = fullCaption;
    }
    if (caption) {
      caption.textContent = fullCaption;
    }
  }

  function openLightbox(card) {
    const visibleCards = getVisibleCards();
    const index = visibleCards.indexOf(card);
    if (index === -1) return;
    lastActiveElement = document.activeElement;
    showIndex(index);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  }

  function closeLightbox() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (img) img.src = "";
    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      lastActiveElement.focus();
    }
  }

  document.querySelectorAll(".photo-card").forEach((card) => {
    card.addEventListener("click", () => openLightbox(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(card);
      }
    });
  });

  closeBtn?.addEventListener("click", closeLightbox);
  backdrop?.addEventListener("click", closeLightbox);

  prevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    showIndex(currentIndex - 1);
  });
  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    showIndex(currentIndex + 1);
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      showIndex(currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      showIndex(currentIndex + 1);
    }
  });
})();

// ==========================================
// Multilingual Translation Engine (ID <-> EN)
// ==========================================
(() => {
  const DICT_EN = {
  "NATURAL AKADEMI": "NATURAL AKADEMI",
  "NATURAL": "NATURAL",
  "AKADEMI": "AKADEMI",
  "Natural Akademi": "Natural Akademi",
  "Natural": "Natural",
  "Akademi": "Akademi",
  "Inkubator Bisnis": "Business Incubator",
  "Natural Akademi | Inkubator Bisnis": "Natural Akademi | Business Incubator",
  "Lewati navigasi": "Skip to content",
  "Buka menu navigasi": "Open navigation menu",
  "Tutup menu navigasi": "Close navigation menu",
  "Beranda": "Home",
  "Tentang Kami": "About Us",
  "Visi dan Misi": "Vision and Mission",
  "Visi dan Misi | Natural Akademi": "Vision and Mission | Natural Akademi",
  "Tujuan Utama": "Main Objectives",
  "Tujuan Utama | Natural Akademi": "Main Objectives | Natural Akademi",
  "Struktur Pengelola": "Management Structure",
  "Struktur Pengelola | Natural Akademi": "Management Structure | Natural Akademi",
  "Program": "Programs",
  "Kurikulum": "Curriculum",
  "Kurikulum Inkubasi UMKM": "MSME Incubation Curriculum",
  "Kurikulum Inkubasi UMKM | Natural Akademi": "MSME Incubation Curriculum | Natural Akademi",
  "Strategi Inkubasi Koperasi": "Cooperative Incubation Strategy",
  "Strategi Inkubasi Koperasi | Natural Akademi": "Cooperative Incubation Strategy | Natural Akademi",
  "Galeri": "Gallery",
  "Galeri Instagram": "Instagram Gallery",
  "Galeri Photo": "Photo Gallery",
  "Galeri Photo | Natural Akademi": "Photo Gallery | Natural Akademi",
  "GALERI PHOTO KEGIATAN": "ACTIVITY PHOTO GALLERY",
  "Mitra": "Partners",
  "Mitra | Natural Akademi": "Partners | Natural Akademi",
  "MITRA KAMI": "OUR PARTNERS",
  "Kontak": "Contact",
  "HUBUNGI KAMI": "CONTACT US",
  "Hubungi Kami": "Contact Us",
  "TAUTAN CEPAT": "QUICK LINKS",
  "Inkubator Bisnis Wiramuda, Pengusaha Perempuan, Disabilitas, Penyintas Bencana, Koperasi Produsen dan Pelaku Usaha Rural (Pesisir & Hutan)": "Business Incubator for Youth Entrepreneurs, Women Entrepreneurs, People with Disabilities, Disaster Survivors, Producer Cooperatives, and Rural Entrepreneurs (Coastal & Forest)",
  "Lihat Program Inkubasi": "View Incubation Programs",
  "DATA JUMLAH TENANT": "TENANT DATA STATISTICS",
  "Pemuda": "Youth",
  "Wirausaha muda (wiramuda) penggerak inovasi daerah.": "Young entrepreneurs driving regional innovation.",
  "Perempuan": "Women",
  "Pengusaha perempuan penopang ketahanan ekonomi keluarga.": "Women entrepreneurs bolstering family economic resilience.",
  "Disabilitas": "Disabilities",
  "Pelaku usaha difabel berdaya dengan pendampingan ramah akses.": "Empowered entrepreneurs with disabilities through accessible coaching.",
  "Penyintas Bencana": "Disaster Survivors",
  "Pemberdayaan kemandirian ekonomi pasca-bencana.": "Economic independence empowerment post-disaster.",
  "Koperasi Komoditi": "Commodity Cooperatives",
  "Koperasi produsen sektor perkebunan, kelautan, dan pertanian.": "Producer cooperatives in plantation, marine, and agriculture sectors.",
  "KDMP": "KDMP",
  "Koperasi Desa Merah Putih sebagai poros ekonomi pedesaan.": "Red and White Village Cooperatives as rural economic hubs.",
  "Startup": "Startups",
  "Rintisan usaha berbasis teknologi dan inovasi produk baru.": "Early-stage ventures driven by technology and product innovation.",
  "LAYANAN DAN PROGRAM INKUBASI": "INCUBATION SERVICES AND PROGRAMS",
  "Program Pendampingan Personal": "Personal Mentorship Program",
  "Konsultasi intensif satu per satu (one-on-one coaching) yang disesuaikan dengan kebutuhan spesifik dan tantangan bisnis setiap tenant.": "Intensive one-on-one coaching tailored to the specific needs and business challenges of each tenant.",
  "Pelatihan Kewirausahaan & Manajemen": "Entrepreneurship & Management Training",
  "Pelatihan Kewirausahaan &amp; Manajemen": "Entrepreneurship & Management Training",
  "Workshop berkala meliputi strategi bisnis, pengelolaan keuangan, pemasaran digital, kepemimpinan, dan legalitas usaha.": "Regular workshops covering business strategy, financial management, digital marketing, leadership, and business legality.",
  "Akses Modal & Pembiayaan": "Capital & Financing Access",
  "Akses Modal &amp; Pembiayaan": "Capital & Financing Access",
  "Fasilitasi hubungan dengan lembaga keuangan, perbankan, angel investor, venture capital, serta program hibah pemerintah.": "Facilitating connections with financial institutions, banking, angel investors, venture capital, and government grants.",
  "Pengembangan & Inovasi Produk": "Product Development & Innovation",
  "Pengembangan &amp; Inovasi Produk": "Product Development & Innovation",
  "Pendampingan riset pasar, uji coba produk, standarisasi mutu, sertifikasi halal/BPOM, dan perlindungan kekayaan intelektual (HAKI).": "Support for market research, product testing, quality standardization, halal/BPOM certification, and intellectual property protection.",
  "Jejaring Bisnis & Kemitraan": "Business Networking & Partnerships",
  "Jejaring Bisnis &amp; Kemitraan": "Business Networking & Partnerships",
  "Membuka peluang kolaborasi strategis antar-tenant, industri, BUMN, asosiasi pengusaha, serta jaringan pasar nasional dan ekspor.": "Opening strategic collaboration opportunities among tenants, industry, SOEs, business associations, and national/export markets.",
  "Fasilitas Co-Working & Infrastruktur": "Co-Working Facilities & Infrastructure",
  "Fasilitas Co-Working &amp; Infrastruktur": "Co-Working Facilities & Infrastructure",
  "Ruang kerja bersama yang representatif dengan fasilitas internet cepat, ruang meeting, studio foto produk, dan alamat kantor virtual.": "Professional shared workspace equipped with high-speed internet, meeting rooms, product photo studio, and virtual office.",
  "Legalitas Usaha & Perizinan": "Business Legality & Licensing",
  "Legalitas Usaha &amp; Perizinan": "Business Legality & Licensing",
  "Bantuan pengurusan NIB, izin edar, sertifikasi, serta konsultasi hukum bisnis untuk memastikan kepatuhan regulasi.": "Assistance with business identification (NIB), distribution permits, certifications, and legal consulting to ensure regulatory compliance.",
  "Akselerasi & Skala Usaha (Scale-Up)": "Acceleration & Scale-Up Program",
  "Akselerasi &amp; Skala Usaha (Scale-Up)": "Acceleration & Scale-Up Program",
  "Program lanjutan untuk tenant siap berkembang: optimasi rantai pasok, penetrasi pasar baru, dan ekspansi kapasitas produksi.": "Advanced program for growth-ready tenants: supply chain optimization, new market penetration, and production expansion.",
  "Demo Day & Temu Investor": "Demo Day & Investor Pitch",
  "Demo Day &amp; Temu Investor": "Demo Day & Investor Pitch",
  "Ajang unjuk karya tahunan bagi tenant lulusan terbaik untuk mempresentasikan bisnis langsung di hadapan calon investor dan mitra strategis.": "Annual showcase for top graduate tenants to pitch their business directly to prospective investors and strategic partners.",
  "Aktivitas Pendampingan": "Mentorship Activities",
  "Dokumentasi video proses inkubasi dan pendampingan pelaku usaha di lapangan.": "Video documentation of incubation processes and on-site business mentoring.",
  "GALERI INSTAGRAM": "INSTAGRAM GALLERY",
  "Ikuti update kegiatan, program inkubasi, dan kabar terbaru Natural Akademi di Instagram resmi kami.": "Follow event updates, incubation programs, and the latest news from Natural Akademi on our official Instagram.",
  "Lihat postingan ini di Instagram": "View this post on Instagram",
  "VISI NATURAL AKADEMI": "VISION OF NATURAL AKADEMI",
  "Inkubator bisnis yang berkomitmen memberdayakan pelaku UMKM dan Koperasi, yang menggunakan bahan dan sumber daya alam (Pertanian, Perkebunan, Peternakan, Perikanan, dan Komoditi).": "A business incubator committed to empowering MSMEs and Cooperatives utilizing natural resources (Agriculture, Plantation, Livestock, Fisheries, and Commodities).",
  "MISI NATURAL AKADEMI": "MISSION OF NATURAL AKADEMI",
  "Pemberdayaan UMKM/Koperasi": "MSME/Cooperative Empowerment",
  "Pengembangan Kapasitas": "Capacity Building",
  "Inovasi dan Teknologi": "Innovation & Technology",
  "Fasilitas Akses Keuangan": "Financial Access Facilitation",
  "Kolaborasi dan Jaringan": "Collaboration & Networking",
  "TUJUAN NATURAL AKADEMI": "OBJECTIVES OF NATURAL AKADEMI",
  "Meningkatkan kemampuan manajerial dan kewirausahaan tenant.": "Enhance tenants' managerial and entrepreneurial capabilities.",
  "Menciptakan produk atau layanan inovatif yang berdaya saing.": "Create competitive, innovative products or services.",
  "Memperluas akses pasar tenant secara lokal, nasional, dan internasional.": "Expand tenants' market access locally, nationally, and internationally.",
  "Meningkatkan pendapatan dan keberlanjutan usaha tenant.": "Increase tenants' business revenue and long-term sustainability.",
  "Memfasilitasi tenant dalam memperoleh pendanaan dan kemitraan strategis.": "Facilitate tenants in securing funding and strategic partnerships.",
  "Mendorong adopsi teknologi digital dalam pengelolaan usaha.": "Drive digital technology adoption in business operations.",
  "Membangun ekosistem bisnis yang inklusif dan berkelanjutan.": "Build an inclusive and sustainable business ecosystem.",
  "Menghasilkan wirausaha baru yang kreatif, adaptif, dan tangguh.": "Produce creative, adaptive, and resilient new entrepreneurs.",
  "Mendukung penciptaan lapangan kerja baru di Aceh.": "Support new job creation across Aceh.",
  "Memberdayakan tenant untuk berkontribusi pada pembangunan ekonomi lokal.": "Empower tenants to contribute to local economic development.",
  "SASARAN NATURAL AKADEMI": "TARGET AUDIENCE OF NATURAL AKADEMI",
  "Pelaku UMKM Miskin": "Underprivileged MSME Entrepreneurs",
  "Perempuan Kepala Keluarga": "Women Heads of Households",
  "Koperasi UMKM/Komoditi": "MSME/Commodity Cooperatives",
  "Wirausaha Muda": "Young Entrepreneurs",
  "STRUKTUR PENGELOLA": "MANAGEMENT STRUCTURE",
  "← Geser ke samping untuk melihat bagan lengkap →": "← Scroll horizontally to view full chart →",
  "&larr; Geser ke samping untuk melihat bagan lengkap &rarr;": "← Scroll horizontally to view full chart →",
  "KETUA": "CHAIRMAN",
  "SEKRETARIS": "SECRETARY",
  "BENDAHARA": "TREASURER",
  "MANAJER KOMODITI": "COMMODITY MANAGER",
  "MANAJER FOOD": "FOOD MANAGER",
  "MANAJER FASHION": "FASHION MANAGER",
  "MANAJER CRAFT": "CRAFT MANAGER",
  "MENTOR & CO MENTOR": "MENTOR & CO-MENTOR",
  "KURIKULUM INKUBASI UMKM": "MSME INCUBATION CURRICULUM",
  "Durasi 3 Bulan · 2x Pertemuan/Minggu": "Duration 3 Months · 2x Meetings/Week",
  "10 Materi Utama": "10 Core Modules",
  "Memahami Dunia Wirausaha": "Understanding Entrepreneurship",
  "Pengembangan Ide dan Inovasi Bisnis": "Business Idea & Innovation Development",
  "Perencanaan Bisnis untuk UMKM": "Business Planning for MSMEs",
  "Keuangan dan Pengelolaan Bisnis": "Finance and Business Management",
  "Pemasaran Digital dan Tradisional (Instagram, Facebook, Tokopedia, Shopee)": "Digital and Traditional Marketing (Instagram, Facebook, Tokopedia, Shopee)",
  "Pengembangan Keterampilan Kepemimpinan dan Manajerial": "Leadership and Managerial Skills Development",
  "Inovasi Berkelanjutan dan Pengembangan Bisnis": "Sustainable Innovation and Business Expansion",
  "Pengembangan Jaringan dan Kemitraan": "Networking and Partnership Development",
  "Penyusunan Proposal dan Akses Pembiayaan": "Proposal Drafting and Financing Access",
  "Evaluasi dan Perbaikan Bisnis (Analisis SWOT)": "Business Evaluation and Improvement (SWOT Analysis)",
  "4 Metode Pembelajaran": "4 Learning Methodologies",
  "Pelatihan Tatap Muka (Workshop dan Seminar Interaktif)": "In-Person Training (Interactive Workshops & Seminars)",
  "Pendampingan Individu (Konseling dan Coaching)": "Individual Mentoring (Counseling & Coaching)",
  "Praktik Lapangan (Pembelajaran berbasis proyek)": "Field Practice (Project-Based Learning)",
  "Pembelajaran Digital (Modul online dan webinar)": "Digital Learning (Online Modules & Webinars)",
  "STRATEGI INKUBASI KOPERASI": "COOPERATIVE INCUBATION STRATEGY",
  "Durasi 6 Bulan": "Duration 6 Months",
  "Redefining | Reorientasi | Revitalisasi | Reorganisasi | Modernisasi Koperasi": "Redefining | Reorientation | Revitalization | Reorganization | Modernization of Cooperatives",
  "4 Pilar Pengembangan Kapasitas": "4 Pillars of Capacity Building",
  "Pilar 01": "Pillar 01",
  "Pilar 02": "Pillar 02",
  "Pilar 03": "Pillar 03",
  "Pilar 04": "Pillar 04",
  "Pelatihan Dasar Pengelolaan Koperasi": "Basic Cooperative Management Training",
  ": administrasi, pembukuan, kepemimpinan, dan perencanaan keuangan.": ": administration, bookkeeping, leadership, and financial planning.",
  "Pendampingan Khusus Bidang Usaha": "Specialized Sector Mentoring",
  ": Produksi, Pertanian presisi/organik, Perikanan ramah lingkungan, serta UMKM & kemasan.": ": Production, precision/organic farming, eco-friendly fisheries, MSMEs & packaging.",
  "Digitalisasi dan Pemasaran Online": "Digitalization and Online Marketing",
  ": Tokopedia, Shopee, Blibli, website e-commerce, Instagram, Facebook, TikTok, dan dasar SEO.": ": Tokopedia, Shopee, Blibli, e-commerce websites, Instagram, Facebook, TikTok, and SEO basics.",
  "Pelatihan Sustainable Business": "Sustainable Business Training",
  ": keberlanjutan ekonomi, sosial, dan lingkungan.": ": economic, social, and environmental sustainability.",
  "Pelatihan Kewirausahaan Berbasis Lokal": "Local Wisdom-Based Entrepreneurship Training",
  "Peningkatan kapasitas manajerial dengan memanfaatkan keunggulan kearifan lokal, potensi komoditas pesisir, pertanian, dan kehutanan Aceh.": "Managerial capacity enhancement leveraging local wisdom, coastal commodities, agriculture, and Aceh forestry.",
  "Inkubasi Teknologi Digital": "Digital Technology Incubation",
  "Bimbingan adopsi teknologi informasi, otomatisasi pencatatan keuangan, sistem inventori, dan pemanfaatan perangkat lunak bisnis.": "Guidance on IT adoption, automated financial recording, inventory systems, and business software utilization.",
  "Akses Keuangan dan Pendanaan": "Financial and Funding Access",
  "Fasilitasi penyusunan proposal bisnis layak investasi dan penghubungan langsung dengan LPDB-KUMKM, perbankan, dan mitra lembaga keuangan resmi.": "Facilitating investment-ready proposals and connecting directly with LPDB-KUMKM, banks, and official financial partners.",
  "Kolaborasi Jaringan Bisnis": "Business Network Collaboration",
  "Peluang sinergi antar-tenant, kemitraan rantai pasok (supply chain), asosiasi pengusaha, perguruan tinggi, dan jaringan wirausaha skala nasional.": "Synergy opportunities among tenants, supply chain partnerships, business associations, universities, and national entrepreneur networks.",
  "Program Inkubasi Cepat (Fast Track)": "Fast-Track Incubation Program",
  "Skema akselerasi khusus bagi usaha dengan kesiapan produk tinggi untuk percepatan standarisasi, perizinan, dan penetrasi pasar komersial.": "Specialized acceleration scheme for high-readiness businesses to fast-track standardization, licensing, and commercial market penetration.",
  "Akses Pasar": "Market Access",
  "Marketplace Showcase": "Marketplace Showcase",
  "Etalase promosi dan fasilitasi listing produk unggulan tenant pada marketplace terkemuka (Tokopedia, Shopee, Blibli) dan pameran bisnis.": "Showcase promotion and product listing facilitation on premier marketplaces (Tokopedia, Shopee, Blibli) and business expos.",
  "Kemitraan Pasar": "Market Partnerships",
  "Fasilitas Produksi": "Production Facilities",
  "Riset dan Pengembangan (R&D)": "Research and Development (R&D)",
  "Pengujian formula produk, inovasi mutu olahan komoditas pangan, diversifikasi produk turunan, dan perbaikan daya simpan produk.": "Product formula testing, processed food quality innovation, derivative product diversification, and shelf-life improvements.",
  "Sharing Marketing & Production": "Shared Marketing & Production",
  "Pemanfaatan bersama fasilitas rumah produksi, mesin pengemasan modern, serta konsolidasi pemasaran bersama untuk menekan biaya operasional.": "Shared utilization of production facilities, modern packaging machinery, and joint marketing consolidation to minimize operational costs.",
  "Semua Kegiatan (16)": "All Activities (16)",
  "Studi Banding & Kunjungan": "Study Tours & Visits",
  "Pameran & Expo": "Expos & Exhibitions",
  "Kemitraan & Edukasi": "Partnerships & Education",
  "Produksi": "Production",
  "Perbesar Foto": "Enlarge Photo",
  "Dokumentasi resmi perjalanan program pendampingan, studi banding, expo & pameran, fasilitasi legalitas & kemitraan, serta pengadaan mesin di Rumah Produksi Natural Akademi.": "Official documentation of mentoring programs, study tours, expos & exhibitions, legal & partnership facilitation, and machinery procurement at Natural Akademi Production House.",
  "Studi Banding Sentra Rendang Payakumbuh": "Payakumbuh Rendang Center Comparative Study",
  "Soft Launching Sharing Packaging & Marketing": "Soft Launching of Shared Packaging & Marketing",
  "Meugah Festival Aceh & SERBU QRIS": "Aceh Meugah Festival & QRIS Campaign",
  "Bazar Banda Aceh Gemilang Expo": "Banda Aceh Gemilang Expo Bazaar",
  "Kitchen Tour & Simulasi Mesin Packaging": "Kitchen Tour & Packaging Machine Simulation",
  "MoU Koperasi Samudera Mandiri Leupung": "MoU with Samudera Mandiri Leupung Cooperative",
  "Kunjungan Ekosistem UMKM Zanana Bandung": "Zanana Bandung MSME Ecosystem Visit",
  "Studi Inovasi Herbal di Acaraki Jamu": "Herbal Innovation Study at Acaraki Jamu",
  "Kerjasama Program bersama LPP RRI Banda Aceh": "Program Collaboration with LPP RRI Banda Aceh",
  "Distribusi Produk ke M Bloc Market Jakarta": "Product Distribution to M Bloc Market Jakarta",
  "Fasilitas Mesin Continuous Band Sealer": "Continuous Band Sealer Machinery Facility",
  "Local Trend Pop-Up Show di Plaza Aceh": "Local Trend Pop-Up Show at Plaza Aceh",
  "Gerai Binaan di Bandara Sultan Iskandar Muda": "Incubated Tenant Store at Sultan Iskandar Muda Airport",
  "MoU Kerjasama Pendidikan bersama SMKN 1": "Educational Partnership MoU with SMKN 1",
  "Meulaboh Digital Festival": "Meulaboh Digital Festival",
  "Talkshow UMKM di Pro 1 RRI Banda Aceh": "MSME Talkshow on Pro 1 RRI Banda Aceh",
  "Jl. Tgk. Adee II No 8, Ulee Kareng,": "Jl. Tgk. Adee II No 8, Ulee Kareng,",
  "Banda Aceh, Aceh, Indonesia 23117": "Banda Aceh, Aceh, Indonesia 23117",
  "Email akademi@naturalaceh.org": "Email: akademi@naturalaceh.org",
  "WhatsApp +62 897-9276-758": "WhatsApp: +62 897-9276-758",
  "- NATURAL AKADEMI / NATURAL ACEH - ALL RIGHTS RESERVED.": "- NATURAL AKADEMI / NATURAL ACEH - ALL RIGHTS RESERVED.",
  "Kemitraan": "Partnerships",
  "Pameran": "Exhibitions",
  "Studi Banding": "Study Tours",
  "Nama Lengkap": "Full Name",
  "Email": "Email",
  "Pesan": "Message",
  "Kirim Pesan": "Send Message",
  "Kirim": "Send",
  "Lokasi": "Location",
  "Alamat": "Address",
  "Telepon": "Phone",
  "Media Sosial": "Social Media",
  "Ikuti Kami": "Follow Us",
  "Pelajari Lebih Lanjut": "Learn More",
  "Lihat Semua Mitra": "View All Partners",
  "Lihat Selengkapnya di Halaman Mitra": "View Full List on Partners Page",
  "Semua Hak Dilindungi.": "All Rights Reserved.",
  "Dikelola oleh Tim Natural Akademi": "Managed by Natural Akademi Team",
  "© COPYRIGHT": "© COPYRIGHT"
};

  const STORAGE_KEY = "natural_akademi_lang";
  const toggleBtn = document.getElementById("lang-toggle");
  if (!toggleBtn) return;

  const langCodeEl = toggleBtn.querySelector(".lang-code-text, .lang-badge-text");
  const badgeCircle = toggleBtn.querySelector(".lang-badge-circle");
  let origDocTitle = document.title;

  function translateNode(node, toLang) {
    if (toLang === "en") {
      if (node._origValue === undefined) {
        node._origValue = node.nodeValue;
      }
      const raw = node._origValue;
      const trimmed = raw.trim();
      if (!trimmed) return;

      if (DICT_EN[trimmed]) {
        const leading = raw.match(/^\s*/)[0];
        const trailing = raw.match(/\s*$/)[0];
        node.nodeValue = leading + DICT_EN[trimmed] + trailing;
      }
    } else {
      if (node._origValue !== undefined) {
        node.nodeValue = node._origValue;
      }
    }
  }

  function walkAndTranslate(root, toLang) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (["script", "style", "svg", "noscript"].includes(tag) || parent.closest("svg") || parent.closest(".lang-toggle-btn")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    nodes.forEach(n => translateNode(n, toLang));

    // Also translate form placeholders and button titles if present
    document.querySelectorAll("input, textarea").forEach(input => {
      const ph = input.getAttribute("placeholder");
      if (ph) {
        if (toLang === "en") {
          input._origPlaceholder = input._origPlaceholder || ph;
          if (DICT_EN[ph.trim()]) {
            input.setAttribute("placeholder", DICT_EN[ph.trim()]);
          }
        } else if (input._origPlaceholder) {
          input.setAttribute("placeholder", input._origPlaceholder);
        }
      }
    });
  }

  function setLanguage(lang, persist = true) {
    const isEn = lang === "en";
    document.documentElement.lang = isEn ? "en" : "id";

    // Update toggle button UI
    toggleBtn.setAttribute("aria-pressed", String(isEn));
    toggleBtn.classList.toggle("is-en", isEn);
    if (langCodeEl) langCodeEl.textContent = isEn ? "EN" : "ID";
    if (badgeCircle) badgeCircle.setAttribute("fill", isEn ? "#0D7A3E" : "#1B498B");
    
    const label = isEn
      ? "Kembalikan ke Bahasa Indonesia / Switch to Indonesian"
      : "Terjemahkan ke Bahasa Inggris / Translate to English";
    toggleBtn.setAttribute("aria-label", label);
    toggleBtn.setAttribute("title", label);

    // Update Page Title
    if (isEn) {
      if (DICT_EN[origDocTitle]) {
        document.title = DICT_EN[origDocTitle];
      } else {
        const parts = origDocTitle.split("|").map(p => p.trim());
        const translatedParts = parts.map(p => DICT_EN[p] || p);
        document.title = translatedParts.join(" | ");
      }
    } else {
      document.title = origDocTitle;
    }

    // Walk and translate body
    walkAndTranslate(document.body, lang);

    // Persist choice
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {}
    }
  }

  toggleBtn.addEventListener("click", () => {
    toggleBtn.style.transform = "scale(0.92)";
    setTimeout(() => {
      toggleBtn.style.transform = "";
    }, 160);

    const currentLang = document.documentElement.lang === "en" ? "en" : "id";
    const nextLang = currentLang === "en" ? "id" : "en";
    setLanguage(nextLang, true);
  });

  // Check saved preference on load
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en") {
      setLanguage("en", false);
    }
  } catch (e) {}
})();
