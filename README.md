# Biggboss Video Website

A modern and attractive website that fetches the latest videos from the Biggboss Odysee channel using RSS feeds.

## Features

- 🎬 **RSS Integration**: Automatically fetches videos from Odysee RSS feed
- 🎨 **Modern Design**: Clean, responsive design with smooth animations
- 📱 **Mobile Friendly**: Fully responsive layout that works on all devices
- ⚡ **Fast Loading**: Optimized performance with lazy loading
- 🔄 **Auto Refresh**: Automatically updates content every 10 minutes
- 🎯 **User Friendly**: Intuitive interface with hover effects and smooth transitions

## Technologies Used

- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with CSS Grid, Flexbox, and animations
- **JavaScript**: ES6+ features for dynamic content loading
- **Font Awesome**: Icon library for enhanced UI
- **Google Fonts**: Inter font for modern typography

## File Structure

```
Biggboss/
│
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Setup Instructions

1. **Download the files**: Ensure all files are in the same directory
2. **Open in browser**: Simply open `index.html` in any modern web browser
3. **No server required**: This is a static website that runs entirely in the browser

## How It Works

1. The website uses a CORS proxy (allorigins.win) to fetch the RSS feed from Odysee
2. The RSS XML is parsed to extract video information including titles, descriptions, links, and thumbnails
3. Video cards are dynamically generated and displayed in a responsive grid layout
4. Clicking on any video card opens the video on Odysee in a new tab

## RSS Feed Source

The website fetches content from: `https://odysee.com/$/rss/@Biggboss:e`

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Features Breakdown

### Design Features
- **Gradient backgrounds** and modern color scheme
- **Hover animations** on video cards and buttons
- **Loading spinner** while fetching content
- **Error handling** with retry functionality
- **Smooth scrolling** and transitions

### Technical Features
- **CORS handling** for cross-origin RSS requests
- **XML parsing** for RSS feed processing
- **Date formatting** with relative time display
- **HTML sanitization** for safe content display
- **Responsive images** with fallback support
- **Keyboard shortcuts** (F5 or Ctrl+R to refresh)

## Customization

You can easily customize the website by modifying:

- **Colors**: Update CSS custom properties in `:root`
- **Fonts**: Change the Google Fonts import and font-family
- **Layout**: Modify the grid structure in `.videos-grid`
- **RSS Source**: Update the `RSS_URL` in script.js

## Performance Optimizations

- CSS animations with GPU acceleration
- Lazy loading for images
- Efficient DOM manipulation
- Optimized CSS with custom properties
- Minimal external dependencies

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions, please check:
1. Browser console for any JavaScript errors
2. Network tab to ensure the RSS feed is loading
3. CORS proxy availability

---

Made with ❤️ for the Biggboss community
