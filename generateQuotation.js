const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');

async function generateQuotation(data) {
  // 讀 HTML 模板
  let template = fs.readFileSync(path.join(__dirname, 'templates', 'quotation.html'), 'utf8');

  // 填入資料
  const rowsHtml = data.items.map(item =>
    `<tr>
       <td>${item.name}</td>
       <td>${item.price}</td>
       <td>${item.qty}</td>
       <td>${item.price * item.qty}</td>
     </tr>`
  ).join('');

  template = template
    .replace('{{clientName}}', data.clientName)
    .replace('{{date}}', new Date().toLocaleDateString())
    .replace('{{rows}}', rowsHtml)
    .replace('{{total}}', data.items.reduce((sum, i) => sum + i.price * i.qty, 0));

  // 用 Puppeteer 轉 PDF
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(template, { waitUntil: 'networkidle0' });

  const pdfPath = path.join(__dirname, `quotation-${Date.now()}.pdf`);
  await page.pdf({ path: pdfPath, format: 'A4' });

  await browser.close();
  return pdfPath;
}

module.exports = generateQuotation;
