const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://softavera.com/');
  const imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => img.src);
  });
  console.log(imgs.filter(src => src.includes('enseigne') || src.includes('logo') || src.includes('client') || src.includes('marque') || src.includes('brand') || src.includes('partenaires') || src.includes('assets/logos/enseignes')));
  await browser.close();
})();
