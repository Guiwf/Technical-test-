import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { formatToCSV } from '../helpers/csvconvert';
import https from 'https'; // Importação para fazer o download da imagem

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--window-size=1920,1080'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.goto('https://rpachallengeocr.azurewebsites.net', { waitUntil: 'networkidle2' });

  const downloadPath = path.join(__dirname, 'downloads');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  }

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  let data: { number: string; id: string; date: string; invoice: string }[] = [];
  let lastNumber: number | null = null;

  for (let i = 0; i < 3; i++) {
    const rows = await page.$$(`tr[role="row"].odd, tr[role="row"].even`);

    for (const row of rows) {
      const text = await row.evaluate(el => el.textContent || '');
      const link = await row.$eval('a', a => a.getAttribute('href')).catch(() => '');

      const regex = /([1-9]|1[0-2])([a-zA-Z0-9]+)(\d{2}-\d{2}-\d{4})/g;
      const match = regex.exec(text);
      if (match) {
        let [_, num, id, date] = match;
        let currentNum = parseInt(num, 10);

        if (lastNumber === null || currentNum === lastNumber + 1) {
          lastNumber = currentNum;
        } else {
          currentNum = lastNumber + 1;
          num = currentNum.toString();
          lastNumber = currentNum;
        }

        if (currentNum >= 10) id = id.slice(1);

        data.push({ number: num, id, date, invoice: link || '' });

        if (link) {
          const imageUrl = `https://rpachallengeocr.azurewebsites.net${link}`;
          console.log(`Baixando imagem de: ${imageUrl}`);
          await downloadImage(imageUrl);
        }
      }
    }

    if (i < 2) {
      const nextButton = await page.$('a[class="paginate_button next"]');
      if (nextButton) {
        await nextButton.click();
        await delay(500);
      } else {
        console.log('Botão "Next" não encontrado.');
        break;
      }
    }
  }

  if (data.length > 0) {
    const csvData = formatToCSV(data);
    const dirPath = path.join(__dirname, 'output');
    const filePath = path.join(dirPath, 'data.csv');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    fs.writeFileSync(filePath, csvData, 'utf8');
    console.log(`Arquivo CSV salvo em: ${filePath}`);
  } else {
    console.log('Dados não encontrados');
  }

  await browser.close();

})();

async function downloadImage(url: string) {
  const fs = require('fs');
  const path = require('path');

  const filename = url.split('/').pop() || 'downloaded_image.png';

  const downloadPath = path.join(__dirname, 'downloads', filename);

  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Erro ao baixar: ${response.statusCode}`));
      }

      const fileStream = fs.createWriteStream(downloadPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(downloadPath);
      });
    }).on('error', reject);
  });
}
