const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, 'messages');

const defaultBarcodeTexts = {
  ar: 'امسح الرمز لعرض خدماتنا',
  bn: 'আমাদের পরিষেবা দেখতে স্ক্যান করুন',
  de: 'Scannen, um unsere Dienstleistungen zu sehen',
  en: 'Scan to view our services',
  es: 'Escanea para ver nuestros servicios',
  fa: 'برای مشاهده خدمات ما اسکن کنید',
  fr: 'Scannez pour voir nos services',
  hi: 'हमारी सेवाएं देखने के लिए स्कैन करें',
  id: 'Pindai untuk melihat layanan kami',
  ru: 'Отсканируйте, чтобы посмотреть наши услуги',
  sw: 'Changanua ili kuona huduma zetu',
  tr: 'Hizmetlerimizi görmek için tarayın',
  ur: 'ہماری خدمات دیکھنے کے لیے اسکین کریں',
  zh: '扫描查看我们的服务',
  pt: 'Escaneie para ver nossos serviços',
  ja: 'スキャンしてサービスを見る',
  pcm: 'Scan to see our service',
  mr: 'आमच्या सेवा पाहण्यासाठी स्कॅन करा',
  te: 'మా సేవలను చూడటానికి స్కాన్ చేయండి',
  ta: 'எங்கள் சேவைகளைக் காண ஸ்கேன் செய்யவும்',
  yue: '掃描以查看我們的服務',
  vi: 'Quét để xem các dịch vụ của chúng tôi',
  tl: 'I-scan upang tingnan ang aming mga serbisyo',
  wuu: '扫描查看服务',
  ko: '서비스를 보려면 스캔하세요',
  ha: 'Duba don ganin ayyukanmu',
  jv: 'Pindai kanggo ndeleng layanan kita',
  it: 'Scansiona per vedere i nostri servizi',
  pnb: 'ساڈیاں خدمتاں دیکھن لئی سکین کرو',
  kn: 'ನಮ್ಮ ಸೇವೆಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ'
};

const removeTranslations = {
  ar: 'حذف',
  bn: 'মুছে ফেলুন',
  de: 'Entfernen',
  en: 'Remove',
  es: 'Eliminar',
  fa: 'حذف',
  fr: 'Supprimer',
  hi: 'निकालें',
  id: 'Hapus',
  ru: 'Удалить',
  sw: 'Ondoa',
  tr: 'Kaldır',
  ur: 'ہٹائیں',
  zh: '移除',
  pt: 'Remover',
  ja: '削除',
  pcm: 'Comot',
  mr: 'काढून टाका',
  te: 'తీసివేయండి',
  ta: 'அகற்று',
  yue: '移除',
  vi: 'Xóa',
  tl: 'Alisin',
  wuu: '移脱',
  ko: '제거',
  ha: 'Cire',
  jv: 'Mbusak',
  it: 'Rimuovi',
  pnb: 'ہٹاؤ',
  kn: 'ತೆಗೆದುಹಾಕಿ'
};

const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));

let updatedCount = 0;

for (const file of files) {
  const langCode = file.replace('.json', '');
  const filePath = path.join(messagesDir, file);
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // Add common.remove
    if (!data.common) data.common = {};
    if (!data.common.remove) {
      data.common.remove = removeTranslations[langCode] || removeTranslations.en;
      modified = true;
    }

    // Add settings.defaultBarcodeText
    if (!data.settings) data.settings = {};
    if (!data.settings.defaultBarcodeText) {
      data.settings.defaultBarcodeText = defaultBarcodeTexts[langCode] || defaultBarcodeTexts.en;
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      console.log(`Updated ${file}`);
      updatedCount++;
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
}

console.log(`\nScript complete. Updated ${updatedCount} files.`);
