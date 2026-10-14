// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import type { UserScriptData } from '../common/declarations'
import { logger } from '../common/logger'
import { UserScriptBase } from '../common/user_base'

const TOGGLE_LABELS = {
  improveTheModelForEveryone: [
    // English
    ['Allow chats to improve the model'],
    // Albanian
    ['Lejo bisedat të përmirësojnë modelin'],
    // Armenian
    ['Թույլատրել զրույցների օգտագործումը՝ մոդելը բարելավելու համար'],
    // Bahasa Melayu
    ['Benarkan sembang menambah baik model'],
    // bosanski
    ['Dozvoli da razgovori poboljšaju model'],
    // Burmese
    ['မော်ဒယ်ကို ပိုကောင်းစေရန် Chat များကို အသုံးပြုခွင့်ပြုရန်'],
    // català
    ['Permet que les converses millorin el model'],
    // čeština
    ['Dovolit využití chatů k vylepšování modelu'],
    // dansk
    ['Tillad, at chats forbedrer modellen'],
    // Deutsch
    ['Erlauben, dass Chats zur Verbesserung des Modells beitragen'],
    // eesti
    ['Luba vestlusi mudeli täiustamiseks kasutada'],
    // español (España)
    ['Permitir que los chats mejoren el modelo'],
    // español (Latinoamérica)
    ['Permitir que los chats mejoren el modelo'],
    // Filipino
    ['I-allow ang mga chat para ma-improve ang model'],
    // français (Canada)
    ['Autoriser l’utilisation des clavardages pour améliorer le modèle'],
    // français (France)
    ['Autoriser l’utilisation des chats pour améliorer le modèle'],
    // Georgian
    ['ჩატების გამოყენების დაშვება მოდელის გასაუმჯობესებლად'],
    // hrvatski
    ['Dopusti da razgovori poboljšaju model'],
    // Icelandic
    ['Leyfa notkun spjalla til að bæta líkanið'],
    // Indonesia
    ['Izinkan obrolan digunakan untuk meningkatkan model'],
    // italiano
    ['Consenti alle chat di migliorare il modello'],
    // Kiswahili
    ['Ruhusu mazungumzo yaboreshe mfumo'],
    // latviešu
    ['Atļaut izmantot tērzēšanas modeļa uzlabošanai'],
    // lietuvių
    ['Leisti naudoti pokalbius modeliui tobulinti'],
    // Macedonian
    ['Дозволи разговорите да го подобруваат моделот'],
    // magyar
    ['Csevegések felhasználásának engedélyezése a modell fejlesztéséhez'],
    // Mongolian
    ['Чатуудыг загварыг сайжруулахад ашиглахыг зөвшөөрөх'],
    // Nederlands
    ['Toestaan dat chats het model verbeteren'],
    // norsk bokmål
    ['Tillat at samtaler forbedrer modellen'],
    // polski
    ['Zezwalaj, by czaty ulepszały model'],
    // português (Brasil)
    ['Permitir que os chats melhorem o modelo'],
    // português (Portugal)
    ['Permitir que as conversas melhorem o modelo'],
    // română
    ['Permite chaturilor să îmbunătățească modelul'],
    // slovenčina
    ['Povoliť používanie četov na zlepšovanie modelu'],
    // slovenščina
    ['Dovoli, da klepeti izboljšajo model'],
    // Somali
    ['U oggolow wada-sheekeysiyada inay moodelka horumariyaan'],
    // suomi
    ['Salli keskusteluiden käyttö mallin parantamiseen'],
    // svenska
    ['Tillåt att chattar förbättrar modellen'],
    // Tiếng Việt
    ['Cho phép dùng nội dung trò chuyện để cải thiện mô hình'],
    // Türkçe
    ['Modeli iyileştirmek için sohbetlere izin ver'],
    // Ελληνικά
    ['Να επιτρέπεται η βελτίωση του μοντέλου μέσω συνομιλιών'],
    // български
    ['Разрешаване на чатовете да подобряват модела'],
    // қазақ тілі
    ['Чаттарды модельді жақсарту үшін пайдалануға рұқсат ету'],
    // русский
    ['Разрешить использовать чаты для улучшения модели'],
    // српски
    ['Дозволи да ћаскања побољшају модел'],
    // українська
    ['Дозволити використовувати чати для покращення моделі'],
    // اردو
    ['چیٹس کو ماڈل بہتر بنانے کی اجازت دیں'],
    // العربية
    ['السماح للدردشات بتحسين النموذج'],
    // فارسی
    ['اجازه استفاده از چت‌ها برای بهبود مدل'],
    // አማርኛ
    ['ውይይቶች ሞዴሉን እንዲያሻሽሉ ፍቀድ'],
    // मराठी
    ['मॉडेल सुधारण्यासाठी चॅट्स वापरण्याची अनुमती द्या'],
    // हिन्दी
    ['मॉडल को बेहतर बनाने के लिए चैट की अनुमति दें'],
    // अनुमति
    ['মডেল উন্নত করতে চ্যাট ব্যবহারের অনুমতি দিন'],
    // ਪੰਜਾਬੀ
    ['ਮਾਡਲ ਨੂੰ ਬਿਹਤਰ ਬਣਾਉਣ ਲਈ ਚੈਟਾਂ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ'],
    // ગુજરાતી
    ['મોડેલને બહેતર બનાવવા માટે ચૅટની મંજૂરી આપો'],
    // தமிழ்
    ['மாடலை மேம்படுத்த அரட்டைகளை அனுமதி'],
    // తెలుగు
    ['మోడల్‌ను మెరుగుపరచడానికి చాట్‌లను అనుమతించు'],
    // ಕನ್ನಡ
    ['ಮಾದರಿಯನ್ನು ಸುಧಾರಿಸಲು ಚಾಟ್‌ಗಳನ್ನು ಅನುಮತಿಸಿ'],
    // മലയാളം
    ['മോഡൽ മെച്ചപ്പെടുത്താൻ ചാറ്റുകൾ അനുവദിക്കുക'],
    // ไทย
    ['อนุญาตให้ใช้แชตเพื่อปรับปรุงโมเดล'],
    // 한국어
    ['채팅을 모델 개선에 사용하도록 허용'],
    // 日本語
    ['モデル改善へのチャット利用を許可'],
    // 简体中文
    ['允许使用聊天改进模型'],
    // 繁體中文（台灣）
    ['允許使用對話改善模型'],
    // 繁體中文（香港）
    ['允許使用對話來改進模型']

  ],
  measurement: [
    // English
    ['Allow marketing measurement'],
    // Albanian
    ['Lejo matjen e marketingut'],
    // Armenian
    ['Թույլատրել մարքեթինգային արդյունավետության չափումը'],
    // Bahasa Melayu
    ['Benarkan pengukuran pemasaran'],
    // bosanski
    ['Dozvoli mjerenje marketinga'],
    // Burmese
    ['စျေးကွက်ရှာဖွေရေး တိုင်းတာမှုကို ခွင့်ပြုရန်'],
    // català
    ['Permet el mesurament de màrqueting'],
    // čeština
    ['Dovolit marketingové měření'],
    // dansk
    ['Tillad marketingmåling'],
    // Deutsch
    ['Marketing-Messung zulassen'],
    // eesti
    ['Luba turunduse mõõtmine'],
    // español (España) or español (Latinoamérica)
    ['Permitir la medición de marketing'],
    // Filipino
    ['I-allow ang marketing measurement'],
    // français (Canada) or français (France)
    ['Autoriser la mesure marketing'],
    // Georgian
    ['მარკეტინგული გაზომვის დაშვება'],
    // hrvatski
    ['Dopusti mjerenje marketinške učinkovitosti'],
    // Icelandic
    ['Leyfa markaðsmælingar'],
    // Indonesia
    ['Izinkan pengukuran pemasaran'],
    // italiano
    ['Consenti la misurazione del marketing'],
    // Kiswahili
    ['Ruhusu upimaji wa uuzaji'],
    // latviešu
    ['Atļaut mārketinga mērījumus'],
    // lietuvių
    ['Leisti rinkodaros vertinimą'],
    // Macedonian
    ['Дозволи мерење на маркетинг'],
    // magyar
    ['Marketingmérés engedélyezése'],
    // Mongolian
    ['Маркетингийн үзүүлэлтийг зөвшөөрөх'],
    // Nederlands
    ['Marketingmeting toestaan'],
    // norsk bokmål
    ['Tillat markedsføringsmåling'],
    // polski
    ['Zezwalaj na analitykę marketingową'],
    // português (Brasil)
    ['Permitir mensuração de marketing'],
    // português (Portugal)
    ['Permitir medição de marketing'],
    // română
    ['Permite măsurarea de marketing'],
    // slovenčina
    ['Povoliť meranie marketingu'],
    // slovenščina
    ['Dovoli merjenje trženja'],
    // Somali
    ['Oggolow cabbirka suuqgeynta'],
    // suomi
    ['Salli markkinoinnin mittaus'],
    // svenska
    ['Tillåt marknadsföringsmätning'],
    // Tiếng Việt
    ['Cho phép đo lường marketing'],
    // Türkçe
    ['Pazarlama ölçümüne izin ver'],
    // Ελληνικά
    ['Να επιτρέπονται οι μετρήσεις μάρκετινγκ'],
    // български
    ['Разрешаване на измерването на маркетинговата ефективност'],
    // қазақ тілі
    ['Маркетинг тиімділігін өлшеуге рұқсат ету'],
    // русский
    ['Разрешить маркетинговые метрики'],
    // српски
    ['Дозволи маркетиншко мерење'],
    // українська
    ['Дозволити оцінювання ефективності маркетингу'],
    // اردو
    ['مارکیٹنگ کی پیمائش کی اجازت دیں'],
    // العربية
    ['السماح بقياس الأداء التسويقي'],
    // فارسی
    ['اجازه دادن به سنجش بازاریابی'],
    // አማርኛ
    ['የማስታወቂያ ልኬትን ፍቀድ'],
    // मराठी
    ['मार्केटिंग मापनाला अनुमती द्या'],
    // हिन्दी
    ['मार्केटिंग मेज़रमेंट की अनुमति दें'],
    // अनुमति
    ['মার্কেটিং অ্যানালিটিক্স অনুমোদন করুন'],
    // ਪੰਜਾਬੀ
    ['ਮਾਰਕੀਟਿੰਗ ਮਾਪ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ'],
    // ગુજરાતી
    ['માર્કેટિંગ માપનની મંજૂરી આપો'],
    // தமிழ்
    ['மார்க்கெட்டிங் அளவீட்டை அனுமதிக்கவும்'],
    // తెలుగు
    ['మార్కెటింగ్ కొలతను అనుమతించు'],
    // ಕನ್ನಡ
    ['ಮಾರ್ಕೆಟಿಂಗ್ ಮಾಪನವನ್ನು ಅನುಮತಿಸಿ'],
    // മലയാളം
    ['വിപണന മൂല്യനിർണ്ണയം അനുവദിക്കുക'],
    // ไทย
    ['อนุญาตการวัดผลการตลาด'],
    // 한국어
    ['마케팅 측정 허용'],
    // 日本語
    ['マーケティング測定を許可'],
    // 简体中文
    ['允许营销衡量'],
    // 繁體中文（台灣）
    ['允許行銷成效衡量'],
    // 繁體中文（香港）
    ['允許市場推廣成效衡量']

  ],
  personalized: [
    // English
    ['Allow personalized marketing'],
    // Albanian
    ['Lejo marketingun e personalizuar'],
    // Armenian
    ['Թույլատրել անհատականացված մարքեթինգը'],
    // Bahasa Melayu
    ['Benarkan pemasaran diperibadikan'],
    // bosanski
    ['Dozvoli personalizirani marketing'],
    // Burmese
    ['စိတ်ကြိုက်ပြုလုပ်ထားသော စျေးကွက်ရှာဖွေရေးကို ခွင့်ပြုရန်'],
    // català
    ['Permet el màrqueting personalitzat'],
    // čeština
    ['Dovolit personalizovaný marketing'],
    // dansk
    ['Tillad tilpasset markedsføring'],
    // Deutsch
    ['Personalisiertes Marketing zulassen'],
    // eesti
    ['Luba isikupärastatud turundus'],
    // español (España) or español (Latinoamérica)
    ['Permitir marketing personalizado'],
    // Filipino
    ['I-allow ang naka-personalize na marketing'],
    // français (Canada) or français (France)
    ['Autoriser le marketing personnalisé'],
    // Georgian
    ['პერსონალიზებული მარკეტინგის დაშვება'],
    // hrvatski
    ['Dopusti personalizirani marketing'],
    // Icelandic
    ['Leyfa sérsniðna markaðssetningu'],
    // Indonesia
    ['Izinkan Pemasaran yang Dipersonalisasi'],
    // italiano
    ['Consenti marketing personalizzato'],
    // Kiswahili
    ['Ruhusu matangazo yaliyobinafsishwa'],
    // latviešu
    ['Atļaut personalizētu mārketingu'],
    // lietuvių
    ['Leisti personalizuotą rinkodarą'],
    // Macedonian
    ['Дозволи персонализиран маркетинг'],
    // magyar
    ['Személyre szabott marketing engedélyezése'],
    // Mongolian
    ['Хувь хүнд тохирсон маркетингийг зөвшөөрөх'],
    // Nederlands
    ['Gepersonaliseerde marketing toestaan'],
    // norsk bokmål
    ['Tillat persontilpasset markedsføring'],
    // polski
    ['Zezwalaj na spersonalizowany marketing'],
    // português (Brasil) or português (Portugal)
    ['Permitir marketing personalizado'],
    // română
    ['Permite marketingul personalizat'],
    // slovenčina
    ['Povoliť personalizovaný marketing'],
    // slovenščina
    ['Dovoli prilagojeno trženje'],
    // Somali
    ['Oggolow suuq-geyn shakhsiyeeysan'],
    // suomi
    ['Salli personoitu markkinointi'],
    // svenska
    ['Tillåt personlig marknadsföring'],
    // Tiếng Việt
    ['Cho phép marketing cá nhân hóa'],
    // Türkçe
    ['Kişiselleştirilmiş pazarlamaya izin ver'],
    // Ελληνικά
    ['Να επιτρέπεται το εξατομικευμένο μάρκετινγκ'],
    // български
    ['Разрешаване на персонализиран маркетинг'],
    // қазақ тілі
    ['Жекелендірілген маркетингке рұқсат ету'],
    // русский
    ['Разрешить персонализированный маркетинг'],
    // српски
    ['Дозволи персонализован маркетинг'],
    // українська
    ['Дозволити персоналізований маркетинг'],
    // اردو
    ['ذاتی نوعیت کی مارکیٹنگ کی اجازت دیں'],
    // العربية
    ['السماح بالتسويق المخصص'],
    // فارسی
    ['اجازه دادن به بازاریابی شخصی‌سازی‌شده'],
    // አማርኛ
    ['ግላዊ የሆነ ማስታወቂያ ፍቀድ'],
    // मराठी
    ['वैयक्तिकृत मार्केटिंगला अनुमती द्या'],
    // हिन्दी
    ['पर्सनलाइज़्ड मार्केटिंग की अनुमति दें'],
    // अनुमति
    ['পার্সোনালাইজড মার্কেটিং অনুমোদন করুন'],
    // ਪੰਜਾਬੀ
    ['ਵਿਅਕਤੀਗਤ ਮਾਰਕੀਟਿੰਗ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ'],
    // ગુજરાતી
    ['પર્સનલાઇઝ કરેલ માર્કેટિંગને મંજૂરી આપો'],
    // தமிழ்
    ['பிரத்தியேக மார்க்கெட்டிங்கை அனுமதிக்கவும்'],
    // తెలుగు
    ['వ్యక్తిగతీకరించిన మార్కెటింగ్‌ను అనుమతించు'],
    // ಕನ್ನಡ
    ['ವೈಯಕ್ತೀಕರಿಸಿದ ಮಾರ್ಕೆಟಿಂಗ್ ಅನ್ನು ಅನುಮತಿಸಿ'],
    // മലയാളം
    ['വ്യക്തിപരമാക്കിയ മാർക്കറ്റിംഗ് അനുവദിക്കുക'],
    // ไทย
    ['อนุญาตการตลาดแบบเฉพาะบุคคล'],
    // 한국어
    ['맞춤형 마케팅 허용'],
    // 日本語
    ['パーソナライズされたマーケティングを許可'],
    // 简体中文
    ['允许个性化营销'],
    // 繁體中文（台灣）
    ['允許個人化行銷'],
    // 繁體中文（香港）
    ['允許個人化市場推廣']

  ]

}

type SwitchKind = keyof typeof TOGGLE_LABELS

const selectorFor = (kind: SwitchKind): string =>
    `button[type="button"][role="switch"]:is(${
        TOGGLE_LABELS[kind]
            .map(l => l.map(item => `[aria-label="${CSS.escape(item)}"]`))
            .join(',')})`

// Extracts user identifier from the website session data,
// stored in the script element.
// Example:
// {
//   "session": {
//     "accessToken": "eyJhcUPQ",
//     "account": {
//       "id": "11111-1111-1111-1111-76fa7af1fc4a",
//       "planType": "free",
//       "isDelinquent": false,
//       "structure": "personal",
//       "residencyRegion": "no_constraint",
//       "computeResidency": "no_constraint",
//       "isFedrampCompliantWorkspace": false
//     },
//     "user": {
//       "id": "user-aMjJnhqwertysdfgh7",
//       "email": "example@email.com",
//       "name": "user name",
//     }
//   }
// }
const getChatGptUserId = (): string | undefined => {
  try {
    const el = document.getElementById('client-bootstrap')
    if (!el?.textContent) return undefined

    const data = JSON.parse(el.textContent) as {
      session?: { user?: { id?: string } };
    }

    return data.session?.user?.id ?? undefined
  } catch {
    return undefined
  }
}

export class ChatgptUserScript extends UserScriptBase {
  readonly version = 6
  readonly includeUrlPatterns: string[] = ['https://chatgpt.com/*']
  readonly excludeUrlPatterns: string[] = []
  readonly userScript: string = 'user.js'
  readonly policyScript: string = 'policy.js'

  getUserId (): string | undefined {
    const userIdFromSession = getChatGptUserId()
    if (userIdFromSession) {
      if (__DEV__) logger.debug(`Extracted user id from the session:${userIdFromSession}`)
      return userIdFromSession
    }

    if (__DEV__) logger.debug('Could not extract user id from the session')

    return undefined
  }

  protected getSiteScriptData ():
  Omit<UserScriptData, 'user_id' | 'initial_execution'> {
    return {
      share_experience_link: '',
      site_name: 'chatgpt.com',
      tasks: [
        {
          uid: '1',
          url: 'https://chatgpt.com/settings/data-controls',
          description: 'Disable "Improve the model for everyone"',
          selector: {
            selector: selectorFor('improveTheModelForEveryone'),
            event: 'click'
          },
          modal_selectors: undefined,
          available_for_countries: undefined,
          unavailable_for_countries: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '2',
          url:
              'https://chatgpt.com/settings/data-controls?view=marketing-privacy',
          description: 'Disable "Marketing measurement"',
          selector: { selector: selectorFor('measurement'), event: 'click' },
          modal_selectors: undefined,
          available_for_countries: ['us'],
          unavailable_for_countries: undefined,
          turn_off: true,
          error_description: undefined
        },
        {
          uid: '3',
          url:
              'https://chatgpt.com/settings/data-controls?view=marketing-privacy',
          description: 'Disable "Personalized marketing"',
          selector: { selector: selectorFor('personalized'), event: 'click' },
          modal_selectors: undefined,
          available_for_countries: ['us'],
          unavailable_for_countries: undefined,
          turn_off: true,
          error_description: undefined
        }
      ]
    }
  }
}

window.UserScriptInstance = new ChatgptUserScript()

// The bundle's value is surfaced via a default export (see webpack.config.js
// `output.library`). A trailing IIFE cannot work here: webpack wraps every
// entry in its own non-returning function wrappers, so a `return` never
// reaches the script's completion value.
export default window.UserScriptInstance.getTasks()
