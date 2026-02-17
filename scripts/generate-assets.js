const fs = require('fs');
const { createCanvas } = require('canvas');

// Create icon
const iconSize = 1024;
const iconCanvas = createCanvas(iconSize, iconSize);
const iconCtx = iconCanvas.getContext('2d');

// White background
iconCtx.fillStyle = '#ffffff';
iconCtx.fillRect(0, 0, iconSize, iconSize);

// Text
iconCtx.fillStyle = '#000000';
iconCtx.font = '72px Arial';
iconCtx.textAlign = 'center';
iconCtx.textBaseline = 'middle';
iconCtx.fillText('NouPro', iconSize/2, iconSize/2);

// Save icon
fs.writeFileSync('assets/icon.png', iconCanvas.toBuffer());
fs.writeFileSync('assets/adaptive-icon.png', iconCanvas.toBuffer());

// Create splash screen
const splashSize = 2048;
const splashCanvas = createCanvas(splashSize, splashSize);
const splashCtx = splashCanvas.getContext('2d');

// White background
splashCtx.fillStyle = '#ffffff';
splashCtx.fillRect(0, 0, splashSize, splashSize);

// Text
splashCtx.fillStyle = '#000000';
splashCtx.font = '144px Arial';
splashCtx.textAlign = 'center';
splashCtx.textBaseline = 'middle';
splashCtx.fillText('NouPro', splashSize/2, splashSize/2);

// Save splash screen
fs.writeFileSync('assets/splash.png', splashCanvas.toBuffer()); 