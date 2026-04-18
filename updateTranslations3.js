const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, 'messages')

const newKeysData = {
  'ar': {
    continueEdit: 'متابعة التعديل',
    autoCancelledTimeout: 'تم الإلغاء تلقائياً: تجاوز مدة التعديل',
    guestCancelled: 'تم الإلغاء من قبل الضيف',
    removedAllItems: 'تم إزالة جميع الأصناف',
    modifiedByGuest: 'تعديل من قبل الضيف',
    cancelledSuccess: 'تم إلغاء الطلب بنجاح'
  },
  'en': {
    continueEdit: 'Continue Editing',
    autoCancelledTimeout: 'Auto-cancelled: Modification timeout',
    guestCancelled: 'Cancelled by Guest',
    removedAllItems: 'Removed all items',
    modifiedByGuest: 'Modified by Guest',
    cancelledSuccess: 'Order cancelled successfully'
  },
  'fr': {
    continueEdit: 'Continuer l\'édition',
    autoCancelledTimeout: 'Annulé auto: Délai expiré',
    guestCancelled: 'Annulé par le client',
    removedAllItems: 'Tous les articles supprimés',
    modifiedByGuest: 'Modifié par le client',
    cancelledSuccess: 'Commande annulée avec succès'
  },
  'es': {
    continueEdit: 'Continuar editando',
    autoCancelledTimeout: 'Cancelado auto: Tiempo agotado',
    guestCancelled: 'Cancelado por el huésped',
    removedAllItems: 'Todos los artículos eliminados',
    modifiedByGuest: 'Modificado por el huésped',
    cancelledSuccess: 'Pedido cancelado con éxito'
  },
  'de': {
    continueEdit: 'Bearbeitung fortsetzen',
    autoCancelledTimeout: 'Auto-storniert: Zeitüberschreitung',
    guestCancelled: 'Vom Gast storniert',
    removedAllItems: 'Alle Artikel entfernt',
    modifiedByGuest: 'Vom Gast geändert',
    cancelledSuccess: 'Bestellung erfolgreich storniert'
  },
  'tr': {
    continueEdit: 'Düzenlemeye Devam Et',
    autoCancelledTimeout: 'Otomatik iptal: Zaman aşımı',
    guestCancelled: 'Misafir tarafından iptal edildi',
    removedAllItems: 'Tüm ürünler çıkarıldı',
    modifiedByGuest: 'Misafir tarafından düzeltildi',
    cancelledSuccess: 'Sipariş başarıyla iptal edildi'
  },
  'id': {
    continueEdit: 'Lanjutkan Mengedit',
    autoCancelledTimeout: 'Dibatalkan otomatis: Waktu habis',
    guestCancelled: 'Dibatalkan oleh Tamu',
    removedAllItems: 'Semua item dihapus',
    modifiedByGuest: 'Diubah oleh Tamu',
    cancelledSuccess: 'Pesanan berhasil dibatalkan'
  },
  'ru': {
    continueEdit: 'Продолжить редактирование',
    autoCancelledTimeout: 'Авто-отмена: Превышено время',
    guestCancelled: 'Отменено гостем',
    removedAllItems: 'Все товары удалены',
    modifiedByGuest: 'Изменено гостем',
    cancelledSuccess: 'Заказ успешно отменен'
  },
  'zh': {
    continueEdit: '继续编辑',
    autoCancelledTimeout: '自动取消：编辑超时',
    guestCancelled: '宾客已取消',
    removedAllItems: '已删除所有商品',
    modifiedByGuest: '宾客已修改',
    cancelledSuccess: '订单取消成功'
  },
  'ja': {
    continueEdit: '編集を続ける',
    autoCancelledTimeout: '自動キャンセル：タイムアウト',
    guestCancelled: 'お客様によりキャンセル',
    removedAllItems: 'すべての項目を削除',
    modifiedByGuest: '宾客が変更しました',
    cancelledSuccess: '注文が正常にキャンセルされました'
  },
  'hi': {
    continueEdit: 'संपादन जारी रखें',
    autoCancelledTimeout: 'ऑटो-रद्द: समय समाप्त',
    guestCancelled: 'अतिथि द्वारा रद्द किया गया',
    removedAllItems: 'सभी आइटम हटा दिए गए',
    modifiedByGuest: 'अतिथि द्वारा संशोधित',
    cancelledSuccess: 'ऑर्डर सफलतापूर्वक रद्द कर दिया गया'
  },
  'bn': {
    continueEdit: 'সম্পাদনা চালিয়ে যান',
    autoCancelledTimeout: 'স্বয়ংক্রিয় বাতিল: সময় শেষ',
    guestCancelled: 'অতিথি দ্বারা বাতিল',
    removedAllItems: 'সব আইটেম সরানো হয়েছে',
    modifiedByGuest: 'অতিথি দ্বারা পরিবর্তিত',
    cancelledSuccess: 'অর্ডার সফলভাবে বাতিল করা হয়েছে'
  },
  'pt': {
    continueEdit: 'Continuar editando',
    autoCancelledTimeout: 'Cancelado auto: Tempo expirado',
    guestCancelled: 'Cancelado pelo hóspede',
    removedAllItems: 'Todos os itens removidos',
    modifiedByGuest: 'Modificado pelo hóspede',
    cancelledSuccess: 'Pedido cancelado com sucesso'
  },
  'it': {
    continueEdit: 'Continua a modificare',
    autoCancelledTimeout: 'Annullato auto: Timeout',
    guestCancelled: 'Annullato dall\'ospite',
    removedAllItems: 'Tutti gli articoli rimossi',
    modifiedByGuest: 'Modificato dall\'ospite',
    cancelledSuccess: 'Ordine annullato con successo'
  },
  'ur': {
    continueEdit: 'ترمیم جاری رکھیں',
    autoCancelledTimeout: 'خودکار منسوخی: وقت ختم',
    guestCancelled: 'مہمان کی طرف سے منسوخ',
    removedAllItems: 'تمام اشیاء ہٹا دی گئیں',
    modifiedByGuest: 'مہمان کی طرف سے ترمیم شدہ',
    cancelledSuccess: 'آرڈر کامیابی سے منسوخ ہو گیا'
  },
  'mr': {
    continueEdit: 'संपादन सुरू ठेवा',
    autoCancelledTimeout: 'स्वयंचलित रद्द: वेळ संपली',
    guestCancelled: 'पाहुण्याद्वारे रद्द',
    removedAllItems: 'सर्व आयटम काढले',
    modifiedByGuest: 'पाहुण्याद्वारे सुधारित',
    cancelledSuccess: 'ऑर्डर यशस्वीरित्या रद्द केली'
  },
  'te': {
    continueEdit: 'సవరణ కొనసాగించండి',
    autoCancelledTimeout: 'ఆటో-రద్దు: సమయం ముగిసింది',
    guestCancelled: 'అతిథి ద్వారా రద్దు చేయబడింది',
    removedAllItems: 'అన్ని అంశాలు తొಲగించబడ్డాయి',
    modifiedByGuest: 'అతిథి ద్వారా సవరించబడింది',
    cancelledSuccess: 'ఆర్డర్ విజయవంతంగా రద్దు చేయబడింది'
  },
  'ta': {
    continueEdit: 'திருத்துவதைத் தொடரவும்',
    autoCancelledTimeout: 'தானாக ரத்து: காலாவதி',
    guestCancelled: 'விருந்தினரால் ரத்து செய்யப்பட்டது',
    removedAllItems: 'அனைத்து பொருட்களும் நீக்கப்பட்டன',
    modifiedByGuest: 'விருந்தினரால் மாற்றப்பட்டது',
    cancelledSuccess: 'ஆர்டர் வெற்றிகரமாக ரத்து செய்யப்பட்டது'
  },
  'yue': {
    continueEdit: '繼續編輯',
    autoCancelledTimeout: '自動取消：逾時',
    guestCancelled: '賓客已取消',
    removedAllItems: '已刪除所有項目',
    modifiedByGuest: '賓客已修改',
    cancelledSuccess: '訂單取消成功'
  },
  'vi': {
    continueEdit: 'Tiếp tục chỉnh sửa',
    autoCancelledTimeout: 'Tự động hủy: Hết thời gian',
    guestCancelled: 'Bị hủy bởi khách',
    removedAllItems: 'Đã xóa tất cả các mặt hàng',
    modifiedByGuest: 'Đã được chỉnh sửa bởi khách',
    cancelledSuccess: 'Đã hủy đơn hàng thành công'
  },
  'tl': {
    continueEdit: 'Ipatuloy ang pag-edit',
    autoCancelledTimeout: 'Auto-nadisika: Timeout',
    guestCancelled: 'Kinansela ng Bisita',
    removedAllItems: 'Lahat ng item tinanggal',
    modifiedByGuest: 'Binago ng Bisita',
    cancelledSuccess: 'Matagumpay na nakansela ang order'
  },
  'wuu': {
    continueEdit: '继续编辑',
    autoCancelledTimeout: '自动取消：超时',
    guestCancelled: '宾客已取消',
    removedAllItems: '已删除所有项目',
    modifiedByGuest: '宾客已修改',
    cancelledSuccess: '订单取消成功'
  },
  'ko': {
    continueEdit: '편집 계속하기',
    autoCancelledTimeout: '자동 취소: 시간 초과',
    guestCancelled: '고객에 의해 취소됨',
    removedAllItems: '모든 항목 삭제됨',
    modifiedByGuest: '고객에 의해 수정됨',
    cancelledSuccess: '주문이 성공적으로 취소되었습니다'
  },
  'fa': {
    continueEdit: 'ادامه ویرایش',
    autoCancelledTimeout: 'لغو خودکار: زمان تمام شد',
    guestCancelled: 'توسط مهمان لغو شد',
    removedAllItems: 'همه موارد حذف شدند',
    modifiedByGuest: 'توسط مهمان ویرایش شد',
    cancelledSuccess: 'سفارش با موفقیت لغو شد'
  },
  'ha': {
    continueEdit: 'Ci gaba da gyara',
    autoCancelledTimeout: 'An soke ta kanta: Lokaci ya kure',
    guestCancelled: 'Bako ya soke',
    removedAllItems: 'An cire duk abubuwa',
    modifiedByGuest: 'Bako ya canza',
    cancelledSuccess: 'An soke oda cikin nasara'
  },
  'sw': {
    continueEdit: 'Endelea kuhariri',
    autoCancelledTimeout: 'Iliyoratibiwa kiotomatiki: Muda umeisha',
    guestCancelled: 'Imeghairiwa na Mgeni',
    removedAllItems: 'Vitu vyote vimeondolewa',
    modifiedByGuest: 'Imebadilishwa na Mgeni',
    cancelledSuccess: 'Agizo limeghairiwa kwa mafanikio'
  },
  'jv': {
    continueEdit: 'Nerusake ngedit',
    autoCancelledTimeout: 'Dibatalke otomatis: Wektu entek',
    guestCancelled: 'Dibatalke dening Tamu',
    removedAllItems: 'Kabeh item dibusak',
    modifiedByGuest: 'Diobahi dening Tamu',
    cancelledSuccess: 'Pesanan kasil dibatalke'
  },
  'pnb': {
    continueEdit: 'ترمیم جاری رکھو',
    autoCancelledTimeout: 'خودکار منسوخی: ویلہ ختم',
    guestCancelled: 'پروہنے ولوں منسوخ',
    removedAllItems: 'ساریاں شیواں ہٹا دتیاں گئیاں',
    modifiedByGuest: 'پروہنے ولوں ترمیم کیتی گئی',
    cancelledSuccess: 'آرڈر کامیابی نال منسوخ ہو گیا'
  },
  'kn': {
    continueEdit: 'ಸಂಪಾದನೆಯನ್ನು ಮುಂದುವರಿಸಿ',
    autoCancelledTimeout: 'ಸ್ವಯಂ-ರದ್ದತಿ: ಸಮಯ ಮೀರಿದೆ',
    guestCancelled: 'ಅತಿಥಿಯಿಂದ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',
    removedAllItems: 'ಎಲ್ಲಾ ವಸ್ತುಗಳನ್ನು ತೆಗೆದುಹಾಕಲಾಗಿದೆ',
    modifiedByGuest: 'ಅತಿಥಿಯಿಂದ ಮಾರ್ಪಡಿಸಲಾಗಿದೆ',
    cancelledSuccess: 'ಆರ್ಡರ್ ಯಶಸ್ವಿಯಾಗಿ ರದ್ದಾಗಿದೆ'
  },
  'pcm': {
    continueEdit: 'Continue to change am',
    autoCancelledTimeout: 'Auto-cancel: Time don pass',
    guestCancelled: 'Guest cancel am',
    removedAllItems: 'All wetin you buy don comot',
    modifiedByGuest: 'Guest don change am',
    cancelledSuccess: 'Your order don cancel well well'
  }
}

const knownLanguages = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.split('.')[0])

for (const lang of knownLanguages) {
  const filePath = path.join(dir, `${lang}.json`)
  let data
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) { continue }
  
  let modified = false

  // Add removedAllItems to presets if missing
  if (data.ordersDetails && data.ordersDetails.presets && !data.ordersDetails.presets.removedAllItems) {
    data.ordersDetails.presets.removedAllItems = (newKeysData[lang] || newKeysData.en).removedAllItems
    modified = true
  }

  // Ensure 'orders' keys are present
  if (!data.orders) data.orders = {}
  const source = newKeysData[lang] || newKeysData.en
  
  const keysToCheck = ['continueEdit', 'autoCancelledTimeout', 'guestCancelled', 'modifiedByGuest', 'cancelledSuccess']
  keysToCheck.forEach(k => {
    if (!data.orders[k]) {
      data.orders[k] = source[k]
      modified = true
    }
  })

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log(`Successfully updated ${lang}.json`)
  }
}
console.log('Update finished.')
