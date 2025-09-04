// RSS Feed URL
const RSS_URL = "https://odysee.com/$/rss/@Biggboss:e";
const CORS_PROXY = "https://api.allorigins.win/get?url=";

// Get video data from URL parameters
function getVideoDataFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    title: urlParams.get("title"),
    link: urlParams.get("link"),
    description: urlParams.get("description"),
    pubDate: urlParams.get("date"),
    guid: urlParams.get("guid"),
  };
}

// Initialize player page
document.addEventListener("DOMContentLoaded", function () {
  const videoData = getVideoDataFromUrl();

  if (videoData.title && videoData.link) {
    loadVideoPlayer(videoData);
    loadRelatedVideos();
    initDescriptionToggle();
    initMiniBar();
  } else {
    // Redirect to home if no video data
    window.location.href = "index.html";
  }
});

// Load video player with data
function loadVideoPlayer(videoData) {
  const videoPlayer = document.getElementById("videoPlayer");
  const videoTitle = document.getElementById("videoTitle");
  const videoDescription = document.getElementById("videoDescription");
  const videoDate = document.getElementById("videoDate");

  console.log("Video data:", videoData); // Debug log

  // Set video details
  videoTitle.textContent = videoData.title;
  videoDescription.textContent = cleanHtml(videoData.description);
  videoDate.innerHTML = `<i class="fas fa-calendar"></i> ${formatDate(
    videoData.pubDate
  )}`;

  // Set video player source
  const embedUrl = getOdyseeEmbedUrl(videoData.link);
  console.log("Original URL:", videoData.link); // Debug log
  console.log("Embed URL:", embedUrl); // Debug log

  // Show loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "video-loading";
  loadingDiv.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <p>Loading video player...</p>
    </div>
  `;
  videoPlayer.parentNode.appendChild(loadingDiv);

  videoPlayer.src = embedUrl;

  // Update mini bar title
  const miniTitle = document.getElementById("miniBarTitle");
  if (miniTitle) miniTitle.textContent = videoData.title;

  // Update page title and meta tags for SEO
  document.title = `${videoData.title} - Bigg Boss 19 | Watch Online`;

  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.content = `Watch "${
      videoData.title
    }" from Bigg Boss 19. ${cleanHtml(videoData.description).substring(
      0,
      150
    )}... Stream episodes, highlights and exclusive content.`;
  }

  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.content = `${videoData.title} - Bigg Boss 19`;
  }

  const ogDescription = document.querySelector(
    'meta[property="og:description"]'
  );
  if (ogDescription) {
    ogDescription.content = `Watch "${videoData.title}" from Bigg Boss 19. Stream the latest episodes and highlights.`;
  }

  // Update Twitter tags
  const twitterTitle = document.querySelector('meta[property="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.content = `${videoData.title} - Bigg Boss 19`;
  }

  const twitterDescription = document.querySelector(
    'meta[property="twitter:description"]'
  );
  if (twitterDescription) {
    twitterDescription.content = `Watch "${videoData.title}" from Bigg Boss 19.`;
  }

  // Update structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: videoData.title,
    description: cleanHtml(videoData.description).substring(0, 500),
    uploadDate: videoData.pubDate,
    thumbnailUrl:
      videoData.thumbnail || "https://your-domain.com/default-thumb.jpg",
    url: window.location.href,
    contentUrl: videoData.link,
    potentialAction: {
      "@type": "WatchAction",
      target: window.location.href,
    },
    publisher: {
      "@type": "Organization",
      name: "Bigg Boss",
      logo: {
        "@type": "ImageObject",
        url: "https://your-domain.com/logo.png",
      },
    },
    genre: "Reality TV",
    keywords: [
      "Bigg Boss 19",
      "Bigg Boss latest episode",
      videoData.title,
      "reality tv India",
      "Bigg Boss highlights",
    ],
  };

  // Inject (append new script so static one can remain as baseline)
  const dynLd = document.createElement("script");
  dynLd.type = "application/ld+json";
  dynLd.textContent = JSON.stringify(structuredData);
  document.head.appendChild(dynLd);

  // Description toggle feature
  function initDescriptionToggle() {
    const para = document.getElementById("videoDescription");
    const toggleBtn = document.getElementById("descToggle");
    if (!para || !toggleBtn) return;
    // Show toggle if content length large
    if (para.textContent.trim().length > 300) {
      toggleBtn.style.display = "inline-block";
    }
    toggleBtn.addEventListener("click", () => {
      const isClamped = para.classList.contains("clamped");
      if (isClamped) {
        para.classList.remove("clamped");
        toggleBtn.querySelector(".more-text").style.display = "none";
        toggleBtn.querySelector(".less-text").style.display = "inline";
      } else {
        para.classList.add("clamped");
        toggleBtn.querySelector(".more-text").style.display = "inline";
        toggleBtn.querySelector(".less-text").style.display = "none";
        para.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  // Mini player bar logic
  function initMiniBar() {
    const bar = document.getElementById("miniPlayerBar");
    if (!bar) return;
    let lastScrollY = window.scrollY;
    const threshold = 420; // show after scrolling below video
    function onScroll() {
      const current = window.scrollY;
      if (current > threshold) {
        bar.classList.add("active");
        bar.setAttribute("aria-hidden", "false");
      } else {
        bar.classList.remove("active");
        bar.setAttribute("aria-hidden", "true");
      }
      lastScrollY = current;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Buttons
    const shareBtn = document.getElementById("miniShare");
    const fullBtn = document.getElementById("miniFullscreen");
    const topBtn = document.getElementById("miniScrollTop");
    if (shareBtn) shareBtn.addEventListener("click", shareVideo);
    if (fullBtn) fullBtn.addEventListener("click", toggleFullscreen);
    if (topBtn)
      topBtn.addEventListener("click", () =>
        window.scrollTo({ top: 0, behavior: "smooth" })
      );
  }
  // Add error handling for iframe
  videoPlayer.onerror = function () {
    console.error("Error loading video iframe");
    showVideoError(videoData.link);
  };

  // Add load event to check if iframe loaded successfully
  videoPlayer.onload = function () {
    console.log("Video iframe loaded successfully");
    // Hide loading indicator
    const loadingDiv = document.querySelector(".video-loading");
    if (loadingDiv) {
      loadingDiv.remove();
    }
  };

  // Fallback: if iframe doesn't load after 10 seconds, show error
  setTimeout(() => {
    if (!videoPlayer.contentDocument && !videoPlayer.contentWindow) {
      console.warn("Video iframe may not have loaded properly");
      showVideoError(videoData.link);
    }
  }, 10000);
}

function showVideoError(originalUrl) {
  const videoWrapper = document.querySelector(".video-wrapper");
  const iframe = document.getElementById("videoPlayer");

  iframe.style.display = "none";

  const errorDiv = document.createElement("div");
  errorDiv.className = "video-error";
  errorDiv.innerHTML = `
    <div class="error-content">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Unable to load video player</h3>
      <p>The embedded video player couldn't load. You can watch the video directly on Odysee.</p>
      <a href="${originalUrl}" target="_blank" class="watch-on-odysee-btn">
        <i class="fas fa-external-link-alt"></i>
        Watch on Odysee
      </a>
    </div>
  `;

  videoWrapper.appendChild(errorDiv);
}

// Load related videos
async function loadRelatedVideos() {
  try {
    showRelatedSkeletons();
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(RSS_URL)}`);
    const data = await response.json();

    if (!data.contents) {
      throw new Error("No content received");
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, "text/xml");
    const items = xmlDoc.querySelectorAll("item");
    const videos = [];

    items.forEach((item, index) => {
      if (index < 6) {
        // Load only 6 related videos
        const video = {
          title: getTextContent(item, "title"),
          description: getTextContent(item, "description"),
          link: getTextContent(item, "link"),
          pubDate: getTextContent(item, "pubDate"),
          thumbnail: extractThumbnail(item),
          guid: getTextContent(item, "guid"),
        };
        videos.push(video);
      }
    });

    displayRelatedVideos(videos);
  } catch (error) {
    console.error("Error loading related videos:", error);
  }
}

function showRelatedSkeletons() {
  const grid = document.getElementById("relatedVideosGrid");
  if (!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement("div");
    sk.className = "related-skeleton";
    grid.appendChild(sk);
  }
}

// Display related videos
function displayRelatedVideos(videos) {
  const grid = document.getElementById("relatedVideosGrid");
  grid.innerHTML = "";

  videos.forEach((video) => {
    const videoCard = createRelatedVideoCard(video);
    grid.appendChild(videoCard);
  });
}

// Create related video card
function createRelatedVideoCard(video) {
  const card = document.createElement("div");
  card.className = "video-card";

  const playerUrl = `player.html?title=${encodeURIComponent(
    video.title
  )}&link=${encodeURIComponent(video.link)}&description=${encodeURIComponent(
    video.description
  )}&date=${encodeURIComponent(video.pubDate)}&guid=${encodeURIComponent(
    video.guid
  )}`;

  card.innerHTML = `
    <div class="video-thumbnail">
      <img 
        src="${
          video.thumbnail ||
          "https://via.placeholder.com/400x225/1a1b2e/7c3aed?text=Bigg+Boss"
        }" 
        alt="${video.title}"
        loading="lazy"
      />
      <div class="play-overlay">
        <i class="fas fa-play"></i>
      </div>
    </div>
    <div class="video-info">
      <h3 class="video-title">${video.title}</h3>
      <div class="video-meta">
        <span class="video-date">
          <i class="fas fa-calendar-alt"></i>
          ${formatDate(video.pubDate)}
        </span>
      </div>
      <p class="video-description">${truncateText(
        cleanHtml(video.description),
        100
      )}</p>
    </div>
  `;

  card.addEventListener("click", () => {
    window.location.href = playerUrl;
  });

  return card;
}

// Utility functions (same as in script.js)
function getTextContent(item, tagName) {
  const element = item.querySelector(tagName);
  return element ? element.textContent.trim() : "";
}

function extractThumbnail(item) {
  const mediaContent = item.querySelector("media\\:content, content");
  if (mediaContent) {
    return mediaContent.getAttribute("url");
  }

  const enclosure = item.querySelector("enclosure");
  if (enclosure && enclosure.getAttribute("type")?.startsWith("image")) {
    return enclosure.getAttribute("url");
  }

  const description = getTextContent(item, "description");
  const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) {
    return imgMatch[1];
  }

  return null;
}

function getOdyseeEmbedUrl(odyseeUrl) {
  try {
    // Ensure HTTPS protocol for embed URLs
    odyseeUrl = odyseeUrl.replace(/^http:/, "https:");

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

function formatDate(dateString) {
  if (!dateString) return "Unknown date";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
}

function cleanHtml(html) {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Player page specific functions
function shareVideo() {
  if (navigator.share) {
    navigator
      .share({
        title: document.getElementById("videoTitle").textContent,
        text: "Check out this Bigg Boss episode!",
        url: window.location.href,
      })
      .catch(console.error);
  } else {
    // Fallback to copying URL to clipboard
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        // Show a temporary notification
        const btn = event.target.closest(".action-btn");
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      })
      .catch(console.error);
  }
}

function toggleFullscreen() {
  const videoWrapper = document.querySelector(".video-wrapper");
  const iframe = document.getElementById("videoPlayer");

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(console.error);
  } else {
    if (videoWrapper.requestFullscreen) {
      videoWrapper.requestFullscreen().catch(console.error);
    } else if (iframe.requestFullscreen) {
      iframe.requestFullscreen().catch(console.error);
    }
  }
}
