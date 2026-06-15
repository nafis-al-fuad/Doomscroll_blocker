# 🛡️ Doomscroll Blocker

A powerful Chrome browser extension designed to protect your focus and reclaim your time by blocking addictive short-form video feeds on YouTube and Facebook.

## 📋 Features

### YouTube Control
- **Block YouTube Shorts** - Stop endless scrolling through short-form videos with multiple blocking modes
- **Remove Sidebar Recommendations** - Hide distracting sidebar video suggestions
- **Disable Grid Shelves** - Remove recommendation grids from the home page
- **Search Filtering** - Filter Shorts from search results
- **Channel Tab Cleanup** - Remove Shorts tabs from channel pages
- **Hide Recommendations** - Minimize recommendation feeds

### Facebook Control
- **Block Facebook Reels** - Redirect direct Reel links away from the feed
- **Bookmark Cleanup** - Remove Watch tab from left sidebar bookmarks
- **Feed Purging** - Clear watch-related content from your newsfeed
- **Grid Filtering** - Filter reels from the newsfeed grid

### Advanced Protection
- **Multiple Block Modes** - Choose how Shorts are handled:
  - 🎭 **Camouflage** - Mute the tab immediately
  - 🌑 **Blackout** - Complete visual blocking
  - 🔄 **Convert to Watch** - Automatically convert Shorts URLs to regular watch pages
  - 🔀 **Redirect** - Send you back to the main page

- **Keyboard & Mouse Scroll Lock** - Prevent accidental scrolling past blocked content
- **Hardware Scroll Lock** - Advanced protection against scroll attacks
- **Options Lock** - Secure your settings with a passphrase to prevent disabling protections on impulse

### Analytics & Insights
- **Session Block Counter** - See how many distracting videos you've blocked this session
- **Time Saved Tracker** - Estimated minutes saved by avoiding short-form content
- **Badge Display** - Quick-glance counter on the extension icon

## 🚀 Installation

1. **Clone or Download** this repository
   ```bash
   git clone https://github.com/DaRk77NesS/Doomscroll_blocker.git
   ```

2. **Generate Extension Icons** (Optional - icons are pre-generated)
   ```bash
   # Using Node.js
   node "Distraction Blocker/generate_icons.js"
   
   # Or using PowerShell
   .\Distraction\ Blocker\generate_icons.ps1
   ```

3. **Load into Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer Mode** (top right)
   - Click **Load unpacked**
   - Select the `Distraction Blocker/doomscroll-blocker/` directory

4. **Start Blocking!** 🎉

## ⚙️ Configuration

### Quick Settings
Click the extension icon to open the **Doomscroll Blocker Dashboard** with these options:

| Setting | Description |
|---------|-------------|
| **Master Switch** | Toggle all blocking functionality on/off |
| **YouTube Shorts Mode** | Choose blocking behavior (camouflage, blackout, convert-watch, redirect, disabled) |
| **Sidebar Strip** | Remove YouTube sidebar recommendations |
| **Grid Shelf Nuke** | Disable recommendation grids on home page |
| **Search Filter** | Remove Shorts from search results |
| **Channel Tab Remove** | Hide Shorts tabs on channel pages |
| **Recommendation Hide** | Block recommendation feeds |
| **Facebook Bookmark Remove** | Remove Watch tab from sidebar |
| **Facebook Watch Purge** | Clear watch content from newsfeed |
| **Facebook Grid Filter** | Filter reels from newsfeed grid |
| **Keyboard Scroll Lock** | Prevent scrolling via keyboard |
| **Mouse Wheel Scroll Lock** | Prevent scrolling via mouse wheel |
| **Options Lock** | Require passphrase to access settings |
| **Options Lock Phrase** | Your custom passphrase (if lock enabled) |

## 📁 Project Structure

```
Distraction Blocker/
├── doomscroll-blocker/              # Main extension directory
│   ├── background.js                # Extension service worker & core logic
│   ├── manifest.json                # Chrome extension manifest (MV3)
│   ├── icons/                       # Extension icons (16x16, 48x48, 128x128)
│   ├── content-scripts/
│   │   ├── youtube.js              # YouTube blocking logic
│   │   └── facebook.js             # Facebook blocking logic
│   └── options/
│       ├── options.html            # Settings UI
│       ├── options.css             # Settings styling
│       └── options.js              # Settings logic
├── generate_icons.js                # Icon generation script (Node.js)
└── generate_icons.ps1               # Icon generation script (PowerShell)
```

## 🛠️ How It Works

### Background Service Worker (`background.js`)
- Manages global settings and storage
- Intercepts navigation events for YouTube Shorts and Facebook Reels
- Applies appropriate blocking mode based on user preferences
- Tracks blocked content and time saved
- Enforces hardware scroll/keyboard locks

### Content Scripts
- **youtube.js** - Injects blocking logic into YouTube pages
- **facebook.js** - Injects blocking logic into Facebook pages
- Hide/block UI elements based on user settings
- Remove skeleton loaders that encourage scrolling

### Options Page
- User-friendly interface to configure all blocking modes
- Persistent settings saved to Chrome storage
- Optional passphrase protection to prevent accidental disabling

## 🎯 Use Cases

- **Boost Productivity** - Eliminate time-wasting short-form video feeds
- **Mental Health** - Reduce algorithmic addiction and endless scrolling
- **Focus Work** - Create distraction-free browsing sessions
- **Family Controls** - Lock settings with a passphrase to maintain screen time boundaries
- **Recovery** - Help combat social media and short-form video addiction

## ⚡ Performance

- **Lightweight** - Minimal memory footprint, optimized for continuous operation
- **Fast Blocking** - Immediate response to page loads and navigation
- **No Content Delays** - Blocking happens at the browser level, not on-page
- **Efficient Storage** - Uses Chrome's native storage APIs for minimal overhead

## 🔒 Privacy & Security

- **No Server Communication** - All processing happens locally in your browser
- **No Data Collection** - Your browsing data never leaves your device
- **No Ads or Tracking** - Completely ad-free and tracker-free
- **Open Source** - Review the code yourself for complete transparency

## 🐛 Troubleshooting

### Shorts Still Appearing?
- Verify the Master Switch is enabled
- Check that YouTube Shorts Mode isn't set to "disabled"
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Reload the extension from `chrome://extensions`

### Settings Not Saving?
- Ensure you're not in Incognito mode (extensions have limited storage there)
- Check that the extension has permission to access the site
- Clear browser cache and try again

### Performance Issues?
- Disable keyboard scroll lock if not needed
- Check for browser conflicts with other extensions
- Update Chrome to the latest version

## 📝 License

This project is provided as-is for personal use and modification.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests with improvements
- Help translate or localize the extension

## 💬 Support

For issues, feature requests, or questions:
1. Check the existing GitHub issues
2. Create a new issue with detailed information
3. Include screenshots or error messages when relevant

## 🎨 Customization

### Modify Icon
Edit the base64 strings in `generate_icons.js` and re-run the icon generation script to create custom extension icons.

### Add More Sites
Extend the content scripts to block doomscroll on additional platforms by:
1. Adding host permissions to `manifest.json`
2. Creating a new content script file
3. Adding blocking logic similar to YouTube/Facebook implementations

---

**Stay Focused. Reclaim Your Time.** ⏱️✨

Made with ❤️ to protect your attention
