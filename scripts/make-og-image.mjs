#!/usr/bin/env node
// Generates public/og-image.png (social share preview, 1200×630) and
// public/apple-touch-icon.png (180×180) from the brand mark.
// Run once after changing the logo: `pnpm brand:og`, then commit the PNGs.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const icon = await readFile('public/favicon.svg', 'utf8');
const inner = icon.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FBFAF6"/>
  <rect x="0" y="0" width="460" height="630" fill="#E6F0E2"/>
  <svg x="110" y="115" width="240" height="400" viewBox="0 0 150 200">${inner}</svg>
  <text x="520" y="270" font-family="Sora, sans-serif" font-weight="700" font-size="72" fill="#1E2E52">pickle my paddle</text>
  <text x="520" y="350" font-family="Work Sans, sans-serif" font-size="36" fill="#3A4A68">Pickleball paddle re-gritting</text>
  <text x="520" y="410" font-family="Work Sans, sans-serif" font-size="36" fill="#4565A6">Pickled, not retired.</text>
</svg>`;

await sharp(Buffer.from(og)).png().toFile('public/og-image.png');

const touch = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#FBFAF6"/>
  <svg x="38" y="15" width="104" height="150" viewBox="0 0 150 200">${inner}</svg>
</svg>`;
await sharp(Buffer.from(touch)).png().toFile('public/apple-touch-icon.png');

console.log('Wrote public/og-image.png and public/apple-touch-icon.png');
