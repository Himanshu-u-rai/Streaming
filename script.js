// RSS Feed URL (base)
const RSS_URL = "https://odysee.com/$/rss/@Biggboss:4";

// Proxy strategies (ordered). Each receives the raw feed URL and returns a fetch URL.
const FEED_SOURCES = [
  // AllOrigins JSON wrapper (has caching; we append a cache-buster query)
  (url) => ({
    mode: "json", // expect JSON with .contents
    url: `https://api.allorigins.win/get?url=${encodeURIComponent(
      url + (url.includes("?") ? "&" : "?") + "_=" + Date.now()
    )}`,
  }),
  // isomorphic-git CORS proxy (returns raw XML)
  (url) => ({
    mode: "text",
    url: `https://cors.isomorphic-git.org/${url}?_=${Date.now()}`,
  }),
  // Direct (may fail due to CORS, but attempt last)
  (url) => ({
    mode: "text",
    url: url + (url.includes("?") ? "&" : "?") + "_=" + Date.now(),
  }),
];

// --- Added SEO helper utilities ---
function slugify(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
function generateRecap(text) {
  const src = (text || "").toLowerCase();
  const tags = [];
  if (/nomination/.test(src)) tags.push("Nominations");
  if (/elimination|evict/.test(src)) tags.push("Elimination");
  if (/wildcard/.test(src)) tags.push("Wildcard");
  if (/task/.test(src)) tags.push("Task");
  if (/captain/.test(src)) tags.push("Captaincy");
  return tags.length ? tags.slice(0, 3).join(" • ") : "Episode highlights";
}

// DOM elements
const videosGrid = document.getElementById("videosGrid");
const loadingSection = document.getElementById("loading");
const errorSection = document.getElementById("error");

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  loadVideos();
});

// Load videos from RSS feed
async function loadVideos() {
  showLoading();

  try {
    const { xmlDoc, sourceIndex } = await fetchFeedWithFallback();

    const items = xmlDoc.querySelectorAll("item");
    const videos = [];
    items.forEach((item) => {
      videos.push({
        title: getTextContent(item, "title"),
        description: getTextContent(item, "description"),
        link: getTextContent(item, "link"),
        pubDate: getTextContent(item, "pubDate"),
        thumbnail: extractThumbnail(item),
        guid: getTextContent(item, "guid"),
      });
    });

    if (!videos.length) throw new Error("No videos found in feed");

    const lastBuildDate =
      xmlDoc.querySelector("lastBuildDate")?.textContent?.trim() || "";
    updateFeedTimestamp(lastBuildDate, sourceIndex);

    displayVideos(videos);
    hideLoading();
  } catch (error) {
    console.error("Error loading videos:", error);
    updateFeedTimestamp("Feed load failed", -1, true);
    showError();
  }
}

// Attempt to fetch the feed using multiple proxy strategies
async function fetchFeedWithFallback() {
  const errors = [];
  for (let i = 0; i < FEED_SOURCES.length; i++) {
    const cfg = FEED_SOURCES[i](RSS_URL);
    try {
      const resp = await fetch(cfg.url, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let xmlString = "";
      if (cfg.mode === "json") {
        const data = await resp.json();
        if (!data?.contents) throw new Error("No .contents in JSON response");
        xmlString = data.contents;
      } else {
        xmlString = await resp.text();
      }
      // Basic validation
      if (!xmlString || !xmlString.includes("<rss"))
        throw new Error("Invalid RSS content");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      if (xmlDoc.querySelector("parsererror"))
        throw new Error("XML parse error");
      return { xmlDoc, sourceIndex: i };
    } catch (e) {
      errors.push({ index: i, message: e.message });
      continue;
    }
  }
  throw new Error(
    "All feed sources failed: " +
      errors.map((e) => `#${e.index}:${e.message}`).join(", ")
  );
}

// Update on-page feed timestamp / source info
function updateFeedTimestamp(lastBuildDate, sourceIndex, isError = false) {
  const wrapper = document.getElementById("feedTimestamp");
  const timeEl = document.getElementById("feedTime");
  if (!wrapper || !timeEl) return;
  const now = new Date();
  if (isError) {
    timeEl.textContent = `Feed refresh failed (${now.toLocaleTimeString()})`;
    timeEl.removeAttribute("datetime");
    wrapper.classList.add("feed-error");
    return;
  }
  const sourceLabels = ["AllOrigins", "Isomorphic CORS", "Direct"];
  const label =
    sourceIndex >= 0
      ? sourceLabels[sourceIndex] || `Source ${sourceIndex}`
      : "Unknown";
  if (lastBuildDate) {
    timeEl.textContent = `Feed updated: ${lastBuildDate} | via ${label}`;
    // Attempt to parse RFC2822 date for datetime attribute
    const parsed = Date.parse(lastBuildDate);
    if (!isNaN(parsed)) {
      timeEl.setAttribute("datetime", new Date(parsed).toISOString());
    }
  } else {
    timeEl.textContent = `Fetched via ${label} at ${now.toLocaleTimeString()}`;
    timeEl.setAttribute("datetime", now.toISOString());
  }
  wrapper.classList.remove("feed-error");
}

// Get text content from XML element
function getTextContent(parent, tagName) {
  const element = parent.querySelector(tagName);
  return element ? element.textContent.trim() : "";
}

// Extract thumbnail from various sources
function extractThumbnail(item) {
  // Try to find thumbnail in different formats
  const mediaContent = item.querySelector(
    'content[medium="image"], content[type*="image"]'
  );
  if (mediaContent) {
    return mediaContent.getAttribute("url");
  }

  const mediaThumbnail = item.querySelector("thumbnail");
  if (mediaThumbnail) {
    return mediaThumbnail.getAttribute("url");
  }

  const enclosure = item.querySelector('enclosure[type*="image"]');
  if (enclosure) {
    return enclosure.getAttribute("url");
  }

  // Try to extract from description
  const description = getTextContent(item, "description");
  const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch) {
    return imgMatch[1];
  }

  // Default thumbnail
  return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%236366f1" opacity="0.1"/><text x="200" y="150" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="%236366f1">🎬</text></svg>';
}

// Display videos in the grid
function displayVideos(videos) {
  videosGrid.innerHTML = "";
  const listElements = [];
  videos.forEach((video, index) => {
    const videoCard = createVideoCard(video, index);
    videosGrid.appendChild(videoCard);
    listElements.push({
      "@type": "ListItem",
      position: index + 1,
      url: video.link,
      name: video.title,
    });
  });
  injectItemListSchema(listElements);
}

function injectItemListSchema(items) {
  if (!items.length) return;
  const existing = document.getElementById("itemListSchema");
  if (existing) existing.remove();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "itemListSchema";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Bigg Boss 19 Episodes",
    itemListElement: items.slice(0, 50), // cap to first 50 to keep payload lean
  });
  document.head.appendChild(script);
}

// Create individual video card
function createVideoCard(video, index) {
  const card = document.createElement("div");
  card.className = "video-card";
  card.style.animationDelay = `${index * 0.1}s`;

  const formattedDate = formatDate(video.pubDate);
  const cleanDescription = cleanHtml(video.description);
  const truncatedDescription = truncateText(cleanDescription, 120);
  const slug = slugify(video.title);
  const recap = generateRecap(video.description);

  card.innerHTML = `
        <div class="video-thumbnail">
            <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
            <div class="play-overlay">
                <i class="fas fa-play"></i>
            </div>
        </div>
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <p class="video-description">${truncatedDescription}</p>
            <div class="video-meta">
                <span class="video-date">
                    <i class="fas fa-calendar-alt"></i>
                    ${formattedDate}
                </span>
            </div>
            <p class="video-recap visually-hidden">Recap: ${recap}</p>
        </div>
    `;

  card.addEventListener("click", () => {
    const playerUrl = `player.html?title=${encodeURIComponent(
      video.title
    )}&link=${encodeURIComponent(video.link)}&description=${encodeURIComponent(
      video.description
    )}&date=${encodeURIComponent(video.pubDate)}&guid=${encodeURIComponent(
      video.guid
    )}&slug=${encodeURIComponent(slug)}`;
    window.location.href = playerUrl;
  });

  return card;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return "Unknown date";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  } catch (error) {
    return "Unknown date";
  }
}

// Clean HTML tags from text
function cleanHtml(html) {
  if (!html) return "";

  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// Truncate text to specified length
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;

  return text.substr(0, maxLength).trim() + "...";
}

// Show loading state
function showLoading() {
  loadingSection.style.display = "flex";
  videosGrid.style.display = "none";
  errorSection.style.display = "none";
}

// Hide loading state
function hideLoading() {
  loadingSection.style.display = "none";
  videosGrid.style.display = "grid";
  errorSection.style.display = "none";
}

// Show error state
function showError() {
  loadingSection.style.display = "none";
  videosGrid.style.display = "none";
  errorSection.style.display = "block";
}

// Auto-refresh videos every 10 minutes
setInterval(loadVideos, 10 * 60 * 1000);

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Add keyboard navigation support
document.addEventListener("keydown", function (e) {
  if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
    e.preventDefault();
    loadVideos();
  }
});

// Add intersection observer for lazy loading optimization
if ("IntersectionObserver" in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
          observer.unobserve(img);
        }
      }
    });
  });

  // Observe images for lazy loading
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("img[data-src]").forEach((img) => {
      imageObserver.observe(img);
    });
  });
}

// Video Modal Functions
function openVideoModal(video) {
  const modal = document.getElementById("videoModal");
  const videoPlayer = document.getElementById("videoPlayer");
  const modalTitle = document.getElementById("modalVideoTitle");
  const modalDescription = document.getElementById("modalVideoDescription");
  const modalDate = document.getElementById("modalVideoDate");

  // Extract video ID and create embed URL
  const embedUrl = getOdyseeEmbedUrl(video.link);

  // Set modal content
  modalTitle.textContent = video.title;
  modalDescription.textContent = cleanHtml(video.description);
  modalDate.textContent = formatDate(video.pubDate);

  // Set video player source
  videoPlayer.src = embedUrl;

  // Show modal
  modal.classList.add("show");
  document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function closeVideoModal() {
  const modal = document.getElementById("videoModal");
  const videoPlayer = document.getElementById("videoPlayer");

  // Hide modal
  modal.classList.remove("show");
  document.body.style.overflow = "auto"; // Restore scrolling

  // Stop video by clearing the source
  videoPlayer.src = "";
}

function getOdyseeEmbedUrl(odyseeUrl) {
  try {
    // Extract the video ID from various Odysee URL formats
    let videoId = "";

    // Format 1: https://odysee.com/@channel:id/video-name:id
    const match1 = odyseeUrl.match(/\/(@[^\/]+)\/([^:]+):([a-zA-Z0-9]+)/);
    if (match1) {
      videoId = match1[3]; // Use the video ID
      return `https://odysee.com/$/embed/${match1[2]}:${videoId}`;
    }

    // Format 2: https://odysee.com/video-name:id
    const match2 = odyseeUrl.match(/\/([^:\/]+):([a-zA-Z0-9]+)/);
    if (match2) {
      return `https://odysee.com/$/embed/${match2[1]}:${match2[2]}`;
    }

    // If no match, try to construct a basic embed URL
    const urlParts = odyseeUrl.split("/");
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart.includes(":")) {
      return `https://odysee.com/$/embed/${lastPart}`;
    }

    // Fallback: return original URL (will open in new tab)
    return odyseeUrl;
  } catch (error) {
    console.error("Error creating embed URL:", error);
    return odyseeUrl;
  }
}

// Close modal when clicking outside of it
document.addEventListener("click", function (event) {
  const modal = document.getElementById("videoModal");
  if (event.target === modal) {
    closeVideoModal();
  }
});

// Close modal with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const modal = document.getElementById("videoModal");
    if (modal.classList.contains("show")) {
      closeVideoModal();
    }
  }
});

// Global variables for enhanced features
let allVideos = [];
let filteredVideos = [];
let currentView = "grid";
let compactMode = false;

// Enhanced display videos function with search and filter
function displayVideos(videos) {
  if (!videos || !videos.length) return;

  // Assume feed already ordered newest first; if not, sort by pubDate desc
  videos.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Extract the most recent video for featured section
  const [featured, ...rest] = videos;
  renderFeaturedVideo(featured);

  allVideos = rest; // exclude featured from grid
  filteredVideos = rest;
  updateVideoCount();
  renderVideoCards();
}

// Update video count in stats
function updateVideoCount() {
  const videoCountElement = document.getElementById("videoCount");
  if (videoCountElement) {
    videoCountElement.textContent = filteredVideos.length;
  }
}

// Render video cards
function renderVideoCards() {
  videosGrid.innerHTML = "";
  videosGrid.className = currentView === "list" ? "videos-list" : "videos-grid";

  filteredVideos.forEach((video, index) => {
    const videoCard = createVideoCard(video, index);
    videosGrid.appendChild(videoCard);
  });
}

function renderFeaturedVideo(video) {
  const section = document.getElementById("featuredVideoSection");
  if (!section || !video) return;

  const formattedDate = formatDate(video.pubDate);
  const cleanDescription = cleanHtml(video.description);
  const shortDescription = truncateText(cleanDescription, 420);
  const playerUrl = `player.html?title=${encodeURIComponent(
    video.title
  )}&link=${encodeURIComponent(video.link)}&description=${encodeURIComponent(
    video.description
  )}&date=${encodeURIComponent(video.pubDate)}&guid=${encodeURIComponent(
    video.guid
  )}`;

  section.innerHTML = `
    <article class="featured-video-card" data-guid="${video.guid}">
      <div class="featured-thumb-wrapper" role="button" tabindex="0" aria-label="Play ${video.title}">
        <img src="${video.thumbnail}" alt="${video.title}" loading="eager" onerror="this.style.opacity=0;">
        <div class="featured-badge"><i class="fas fa-star"></i> NEW</div>
      </div>
      <div class="featured-content">
        <h2 class="featured-title">${video.title}</h2>
        <p class="featured-description">${shortDescription}</p>
        <div class="featured-meta">
          <span class="meta-item"><i class="fas fa-calendar-alt"></i>${formattedDate}</span>
          <span class="meta-item"><i class="fas fa-video"></i>Episode</span>
          <span class="meta-item"><i class="fas fa-clock"></i>Latest</span>
        </div>
        <div class="featured-actions">
          <button class="featured-play-btn" onclick="window.location.href='${playerUrl}'"><i class="fas fa-play"></i> Watch Now</button>
          <button class="featured-secondary-btn" onclick="scrollToGrid()"><i class="fas fa-list"></i> Browse All</button>
        </div>
      </div>
    </article>`;

  section.style.display = "block";

  // Accessibility keyboard support
  const thumb = section.querySelector(".featured-thumb-wrapper");
  if (thumb) {
    thumb.addEventListener("click", () => (window.location.href = playerUrl));
    thumb.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.location.href = playerUrl;
      }
    });
  }
}

function scrollToGrid() {
  const grid = document.getElementById("videosGrid");
  if (grid) grid.scrollIntoView({ behavior: "smooth" });
}

// Density toggle
function toggleDensity() {
  compactMode = !compactMode;
  document.body.classList.toggle("compact", compactMode);
  const btn = document.getElementById("densityToggle");
  if (btn) {
    const icon = btn.querySelector("i");
    if (compactMode) {
      icon.className = "fas fa-expand-alt";
      btn.classList.add("active");
    } else {
      icon.className = "fas fa-compress-alt";
      btn.classList.remove("active");
    }
  }
  // Re-render to ensure any view-specific calculations remain consistent
  renderVideoCards();
}

// Search functionality
function setupSearchAndFilter() {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortBy");

  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", handleSort);
  }
}

function handleSearch(event) {
  const query = event.target.value.toLowerCase().trim();

  if (query === "") {
    filteredVideos = allVideos;
  } else {
    filteredVideos = allVideos.filter(
      (video) =>
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query)
    );
  }

  updateVideoCount();
  renderVideoCards();
}

function handleSort(event) {
  const sortBy = event.target.value;

  filteredVideos.sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.pubDate) - new Date(a.pubDate);
    } else if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  renderVideoCards();
}

// View toggle functionality
function toggleView() {
  const toggleBtn = document.getElementById("viewToggle");
  const icon = toggleBtn.querySelector("i");

  if (currentView === "grid") {
    currentView = "list";
    icon.className = "fas fa-th-large";
    toggleBtn.classList.add("active");
  } else {
    currentView = "grid";
    icon.className = "fas fa-list";
    toggleBtn.classList.remove("active");
  }

  renderVideoCards();
}

// Enhanced animations for better UX
function addEnhancedAnimations() {
  // Add stagger animation to video cards
  const cards = document.querySelectorAll(".video-card");
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
    card.style.animation = "fadeInUp 0.6s ease forwards";
  });

  // Add parallax effect to hero section
  const hero = document.querySelector(".hero");
  if (hero) {
    window.addEventListener("scroll", () => {
      const scrolled = window.pageYOffset;
      const parallax = scrolled * 0.5;
      hero.style.transform = `translateY(${parallax}px)`;
    });
  }
}

// Enhanced particle animation
function createParticleEffect() {
  const particles = document.querySelector(".hero-particles");
  if (!particles) return;

  // Create floating particles
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      background: var(--primary-color);
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: float ${Math.random() * 3 + 2}s ease-in-out infinite;
      animation-delay: ${Math.random() * 2}s;
      opacity: 0.6;
    `;
    particles.appendChild(particle);
  }
}

// Initialize enhanced features
document.addEventListener("DOMContentLoaded", function () {
  setupSearchAndFilter();
  createParticleEffect();
  setupFAQAccordion();

  // Add smooth scroll behavior
  document.documentElement.style.scrollBehavior = "smooth";

  // Add loading animation to refresh button
  const refreshBtn = document.querySelector(".refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      const icon = this.querySelector("i");
      icon.style.animation = "spin 1s linear infinite";

      setTimeout(() => {
        icon.style.animation = "";
      }, 2000);
    });
  }
});

// FAQ accordion: make details act like an accessible accordion (one open at a time)
function setupFAQAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  if (!faqItems || !faqItems.length) return;

  faqItems.forEach((item) => {
    // set ARIA state initially
    item.setAttribute("role", "region");
    const summary = item.querySelector("summary");
    if (!summary) return;

    // toggle aria-expanded on click
    summary.addEventListener("click", (e) => {
      // When opening, close other items
      if (!item.hasAttribute("open")) {
        faqItems.forEach((other) => {
          if (other !== item && other.hasAttribute("open"))
            other.removeAttribute("open");
        });
        item.setAttribute("open", "");
      } else {
        item.removeAttribute("open");
      }
    });

    // keyboard support on summary (Enter/Space)
    summary.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        summary.click();
      }
    });
  });
}

// Add CSS for list view
const additionalStyles = `
.videos-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.videos-list .video-card {
  display: flex;
  flex-direction: row;
  max-width: 100%;
  height: 200px;
}

.videos-list .video-thumbnail {
  width: 300px;
  flex-shrink: 0;
}

.videos-list .video-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
}

.videos-list .video-meta {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
}

@media (max-width: 768px) {
  .videos-list .video-card {
    flex-direction: column;
    height: auto;
  }
  
  .videos-list .video-thumbnail {
    width: 100%;
    height: 200px;
  }
}
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
