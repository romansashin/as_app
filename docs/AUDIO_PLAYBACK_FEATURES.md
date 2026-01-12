# Background Audio Playback

## Features

Application supports continuous audio playback, even when:
- Device screen turned off
- Device goes to sleep
- User switches to another app

## Technologies

### 1. Wake Lock API
- Prevents automatic device sleep during playback
- Automatically restores when returning to page
- Released when session ends

### 2. Media Session API
- Shows track information on lock screen
- Displays practice and category name
- Allows playback control from lock screen (iOS/Android)

### 3. HTML5 Audio Attributes
- `playsinline` - allows playback without fullscreen mode on iOS
- `preload="auto"` - preloads audio for smooth playback

## Browser Support

### Full Support
- ✅ Chrome/Edge (Android, Desktop)
- ✅ Safari (iOS 16.4+, macOS)
- ✅ Firefox (Desktop)

### Partial Support
- ⚠️ Safari (iOS < 16.4) - Wake Lock not supported, but Media Session works
- ⚠️ Firefox (Android) - Wake Lock in development

### iOS Notes
- Wake Lock API available only from iOS 16.4+
- Earlier iOS versions rely on Media Session API only
- Users recommended to update iOS to latest version

## Testing

To check functionality:

1. Start practice on mobile device
2. Press Play button
3. Turn off screen with power button
4. Audio should continue playing
5. Lock screen should show playback controls

### Debug

Open browser console (for mobile use remote debugging):
- `🔒 Wake Lock activated` - Wake Lock successfully acquired
- `🎵 Media Session configured` - Media Session initialized
- `🎧 Audio element configured` - HTML5 audio configured

## Known Limitations

1. **Autoplay**
   - Most browsers require user interaction before playback
   - Wake Lock activates only after Play press

2. **Power Consumption**
   - Wake Lock increases device power consumption
   - Recommended to use device with sufficient battery charge

3. **Mobile Data**
   - Audio streaming may consume mobile traffic
   - Recommended to use Wi-Fi for practices

## User Recommendations

### For iOS
- Update iOS to version 16.4 or newer
- Ensure Safari media playback is allowed in settings

### For Android
- Use Chrome or Edge for best support
- Check power saving settings - some manufacturers (Samsung, Xiaomi) aggressively stop background processes

### General
- Keep application open in browser (don't close tab)
- Ensure device sound is not muted
- Test functionality on first use

---

**Version:** 1.2.0  
**Status:** Production Ready
