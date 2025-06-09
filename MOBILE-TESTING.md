# Mobile Testing Setup

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open mobile testing interface:**
   - Open `mobile-test.html` in your browser
   - Or visit the mobile preview at `mobile-preview.html`

## Testing Options

### Option 1: Mobile Device Simulators (mobile-test.html)
- iPhone 15 Pro simulator (320x640)
- iPad Pro simulator (480x640)
- Rotation controls
- Live refresh capability
- Touch event simulation

### Option 2: Browser DevTools
1. Open your browser DevTools (F12)
2. Click the device toggle icon
3. Select iPhone, iPad, or other mobile devices
4. Navigate to `http://localhost:5000`

### Option 3: Real Device Testing
1. Find your computer's IP address:
   ```bash
   # On Windows
   ipconfig
   
   # On Mac/Linux
   ifconfig
   ```
2. On your mobile device, visit: `http://[YOUR-IP]:5000`
3. Ensure both devices are on the same network

## Mobile Features Tested

### ✅ Responsive Design
- Mobile-first layout adjustments
- Touch-friendly button sizes (44px minimum)
- Optimized typography for mobile screens
- Proper spacing and padding

### ✅ Navigation
- Mobile hamburger menu
- Bottom navigation bar
- Touch-optimized tap targets
- Smooth transitions

### ✅ Upload Functionality
- Camera access on mobile devices
- File picker integration
- Drag and drop (where supported)
- Image preview optimization

### ✅ Analysis Interface
- Mobile-optimized progress indicators
- Touch-friendly step navigation
- Responsive card layouts
- Readable text sizes

### ✅ Performance
- Fast loading on mobile networks
- Optimized image handling
- Efficient API calls
- Smooth animations

## Browser Compatibility

### Mobile Browsers Tested
- Safari (iOS 14+)
- Chrome Mobile (Android 8+)
- Firefox Mobile
- Samsung Internet
- Edge Mobile

### Features Support
- Camera API: ✅ iOS Safari, Chrome Mobile
- File Upload: ✅ All mobile browsers
- WebSocket: ✅ All modern mobile browsers
- Progressive Web App: Ready for implementation

## Troubleshooting

### Camera Not Working
1. Ensure HTTPS in production
2. Check browser permissions
3. Test on different devices

### Touch Events Not Responding
1. Verify touch target sizes (minimum 44px)
2. Check for JavaScript errors
3. Test scroll behavior

### Layout Issues
1. Check viewport meta tag
2. Verify CSS media queries
3. Test on different screen sizes

## Development Tips

### Mobile-First Development
```css
/* Base styles for mobile */
.component {
  padding: 16px;
  font-size: 16px;
}

/* Desktop enhancements */
@media (min-width: 768px) {
  .component {
    padding: 24px;
    font-size: 18px;
  }
}
```

### Touch Optimization
```css
/* Touch-friendly buttons */
.btn-mobile {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
}

/* Remove hover effects on touch devices */
@media (hover: none) and (pointer: coarse) {
  .btn:hover {
    transform: none;
  }
}
```

## Performance Monitoring

Monitor these metrics on mobile:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

Use browser DevTools > Lighthouse for mobile performance audits.