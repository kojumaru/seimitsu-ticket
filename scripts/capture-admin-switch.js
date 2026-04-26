#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ADMIN_PASSWORD = 'seimitsu';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const credentials = Buffer.from(`admin:${ADMIN_PASSWORD}`).toString('base64');
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${credentials}`
    });

    console.log('📸 Capturing admin page for せいみつスイッチ...');
    await page.goto('https://seimitsu-ticket.vercel.app/admin?exhibitId=switch', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const filePath = path.join(__dirname, '../docs/screenshots/07-admin-switch.png');
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`✅ Saved: ${filePath}`);

    await page.close();
    console.log('✨ Done!');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
