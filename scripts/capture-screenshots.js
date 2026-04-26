#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://seimitsu-ticket.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const ADMIN_PASSWORD = 'seimitsu';

// Create screenshots directory if it doesn't exist
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const screenshots = [
  {
    name: '01-guide-list.png',
    url: `${BASE_URL}/guide`,
    title: 'ガイド一覧画面'
  },
  {
    name: '02-guide-project.png',
    url: `${BASE_URL}/guide/project`,
    title: 'Project詳細'
  },
  {
    name: '03-guide-142.png',
    url: `${BASE_URL}/guide/142`,
    title: '142号室詳細'
  },
  {
    name: '04-guide-146.png',
    url: `${BASE_URL}/guide/146`,
    title: '146号室詳細'
  },
  {
    name: '05-admin.png',
    url: `${BASE_URL}/admin`,
    title: '管理画面'
  }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new'
  });

  try {
    for (const screenshot of screenshots) {
      console.log(`📸 Capturing: ${screenshot.title}...`);
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      try {
        // Set basic auth header for admin page
        if (screenshot.url.includes('/admin')) {
          const credentials = Buffer.from(`admin:${ADMIN_PASSWORD}`).toString('base64');
          await page.setExtraHTTPHeaders({
            'Authorization': `Basic ${credentials}`
          });
        }

        await page.goto(screenshot.url, { waitUntil: 'networkidle2', timeout: 30000 });
        // Wait a bit for animations to settle
        await new Promise(resolve => setTimeout(resolve, 1000));

        const filePath = path.join(SCREENSHOTS_DIR, screenshot.name);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`✅ Saved: ${filePath}`);
      } catch (error) {
        console.error(`❌ Error capturing ${screenshot.title}: ${error.message}`);
      } finally {
        await page.close();
      }
    }

    console.log('\n✨ All screenshots captured!');
    console.log(`📁 Location: ${SCREENSHOTS_DIR}`);
  } finally {
    await browser.close();
  }
})();
