import https from 'https'; 

export async function downloadImage(url: string) {
    const fs = require('fs');
    const path = require('path');
  
    const filename = url.split('/').pop() || 'downloaded_image.png';
  
    const downloadPath = path.join(__dirname, '..', 'page', 'downloads', filename);
    
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
  
