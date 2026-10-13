// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import type { UserScriptData } from '../common/declarations'
import { logger } from '../common/logger'
import { UserScriptBase } from '../common/user_base'

// The display name rendered in the account menu is used as a fallback when
// the oai-client-auth-info cookie is missing or unparsable.
const USER_IDENTIFIER_SELECTOR =
    '[data-testid="accounts-profile-button"] .truncate'
const AUTH_INFO_COOKIE_NAME = 'oai-client-auth-info'
const PLI_USER_IDENTIFIER = 'precise_location_identity'

interface AuthInfoCookie {
  user?: {name?: string;};
}

const TOGGLE_LABELS = {
  improveTheModelForEveryone: [
    // English
    ['chats', 'improve', 'model'],
    // Albanian
    ['bisedat', 'përmirësojnë', 'modelin'],
    // Armenian
    ['Թույլատրել', 'օգտագործումը՝', 'բարելավելու'],
    // Bahasa Melayu
    ['Benarkan', 'menambah', 'model'],
    // bosanski
    ['Dozvoli', 'razgovori', 'model'],
    // Burmese
    ['မော်ဒယ်ကို', 'များကို', 'အသုံးပြုခွင့်ပြုရန်'],
    // català
    ['Permet', 'converses', 'millorin', 'model'],
    // čeština
    ['Dovolit', 'chatů', 'vylepšování', 'modelu'],
    // dansk
    ['Tillad', 'forbedrer', 'modellen'],
    // Deutsch
    ['Erlauben', 'Verbesserung', 'Modells'],
    // eesti
    ['Luba', 'mudeli', 'täiustamiseks'],
    // español (España)
    ['Permitir', 'mejoren', 'modelo'],
    // español (Latinoamérica)
    ['Permitir', 'mejoren', 'modelo'],
    // Filipino
    ['I-allow', 'ma-improve', 'model'],
    // français (Canada)
    ['Autoriser', 'clavardages', 'améliorer', 'modèle'],
    // français (France)
    ['Autoriser', 'l’utilisation', 'améliorer', 'modèle'],
    // Georgian
    ['ჩატების', 'მოდელის', 'გასაუმჯობესებლად'],
    // hrvatski
    ['Dopusti', 'razgovori', 'model'],
    // Icelandic
    ['Leyfa', 'spjalla', 'bæta', 'líkanið'],
    // Indonesia
    ['Izinkan', 'digunakan', 'meningkatkan', 'model'],
    // italiano
    ['Consenti', 'migliorare', 'modello'],
    // Kiswahili
    ['Ruhusu', 'mazungumzo', 'yaboreshe', 'mfumo'],
    // latviešu
    ['Atļaut', 'tērzēšanas', 'modeļa', 'uzlabošanai'],
    // lietuvių
    ['Leisti', 'pokalbius', 'modeliui', 'tobulinti'],
    // Macedonian
    ['Дозволи', 'разговорите', 'подобруваат', 'моделот'],
    // magyar
    ['Csevegések', 'engedélyezése', 'modell', 'fejlesztéséhez'],
    // Mongolian
    ['Чатуудыг', 'сайжруулахад', 'ашиглахыг', 'зөвшөөрөх'],
    // Nederlands
    ['Toestaan', 'chats', 'model', 'verbeteren'],
    // norsk bokmål
    ['Tillat', 'forbedrer', 'modellen'],
    // polski
    ['Zezwalaj', 'ulepszały', 'model'],
    // português (Brasil)
    ['Permitir', 'melhorem', 'modelo'],
    // português (Portugal)
    ['Permitir', 'melhorem', 'modelo'],
    // română
    ['Permite', 'îmbunătățească', 'modelul'],
    // slovenčina
    ['Povoliť', 'zlepšovanie', 'modelu'],
    // slovenščina
    ['Dovoli', 'izboljšajo', 'model'],
    // Somali
    ['oggolow', 'moodelka', 'horumariyaan'],
    // suomi
    ['Salli', 'keskusteluiden', 'parantamiseen'],
    // svenska
    ['Tillåt', 'förbättrar', 'modellen'],
    // Tiếng Việt
    ['phép', 'chuyện', 'thiện'],
    // Türkçe
    ['Modeli', 'iyileştirmek', 'sohbetlere'],
    // Ελληνικά
    ['επιτρέπεται', 'μοντέλου', 'συνομιλιών'],
    // български
    ['Разрешаване', 'подобряват', 'модела'],
    // қазақ тілі
    ['Чаттарды', 'пайдалануға', 'рұқсат'],
    // русский
    ['Разрешить', 'чаты', 'модели'],
    // српски
    ['Дозволи', 'побољшају', 'модел'],
    // українська
    ['Дозволити', 'чати', 'покращення'],
    // اردو
    ['چیٹس', 'بنانے', 'اجازت'],
    // العربية
    ['السماح', 'للدردشات', 'النموذج'],
    // فارسی
    ['اجازه', 'استفاده', 'بهبود'],
    // አማርኛ
    ['ውይይቶች', 'እንዲያሻሽሉ', 'ፍቀድ'],
    // मराठी
    ['मॉडेल', 'वापरण्याची', 'अनुमती'],
    // हिन्दी
    ['मॉडल', 'बनाने', 'अनुमति'],
    // अनुमति
    ['মডেল', 'ব্যবহারের', 'অনুমতি'],
    // ਪੰਜਾਬੀ
    ['ਮਾਡਲ', 'ਬਣਾਉਣ', 'ਇਜਾਜ਼ਤ'],
    // ગુજરાતી
    ['મોડેલને', 'બનાવવા', 'ચૅટની'],
    // தமிழ்
    ['மாடலை', 'மேம்படுத்த', 'அரட்டைகளை'],
    // తెలుగు
    ['మోడల్‌ను', 'చాట్‌లను', 'అనుమతించు'],
    // ಕನ್ನಡ
    ['ಮಾದರಿಯನ್ನು', 'ಚಾಟ್‌ಗಳನ್ನು', 'ಅನುಮತಿಸಿ'],
    // മലയാളം
    ['മോഡൽ', 'മെച്ചപ്പെടുത്താൻ', 'അനുവദിക്കുക'],
    // ไทย
    ['മോഡൽ', 'മെച്ചപ്പെടുത്താൻ', 'അനുവദിക്കുക'],
    // 한국어
    ['채팅을', '개선에', '사용하도록'],
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
    ['marketing', 'measurement'],
    // Albanian
    ['matjen', 'marketingut'],
    // Armenian
    ['Թույլատրել', 'մարքեթինգային', 'արդյունավետության'],
    // Bahasa Melayu
    ['Benarkan', 'pengukuran', 'pemasaran'],
    // bosanski
    ['Dozvoli', 'mjerenje', 'marketinga'],
    // Burmese
    ['စျေးကွက်ရှာဖွေရေး', 'တိုင်းတာမှုကို', 'ခွင့်ပြုရန်'],
    // català
    ['Permet', 'mesurament', 'màrqueting'],
    // čeština
    ['Dovolit', 'marketingové', 'měření'],
    // dansk
    ['Tillad', 'marketingmåling'],
    // Deutsch
    ['Marketing', 'Messung', 'zulassen'],
    // eesti
    ['Luba', 'turunduse', 'mõõtmine'],
    // español (España)
    ['Permitir', 'medición', 'marketing'],
    // español (Latinoamérica)
    ['Permitir', 'medición', 'marketing'],
    // Filipino
    ['I-allow', 'marketing', 'measurement'],
    // français (Canada)
    ['Autoriser', 'mesure', 'marketing'],
    // français (France)
    ['Autoriser', 'mesure', 'marketing'],
    // Georgian
    ['მარკეტინგული', 'გაზომვის', 'დაშვება'],
    // hrvatski
    ['Dopusti', 'marketinške', 'učinkovitosti'],
    // Icelandic
    ['Leyfa', 'markaðsmælingar'],
    // Indonesia
    ['Izinkan', 'pengukuran', 'pemasaran'],
    // italiano
    ['Consenti', 'misurazione', 'marketing'],
    // Kiswahili
    ['Ruhusu', 'upimaji', 'uuzaji'],
    // latviešu
    ['Atļaut', 'mārketinga', 'mērījumus'],
    // lietuvių
    ['Leisti', 'rinkodaros', 'vertinimą'],
    // Macedonian
    ['Дозволи', 'мерење', 'маркетинг'],
    // magyar
    ['Marketingmérés', 'engedélyezése'],
    // Mongolian
    ['Маркетингийн', 'үзүүлэлтийг', 'зөвшөөрөх'],
    // Nederlands
    ['Marketingmeting', 'toestaan'],
    // norsk bokmål
    ['Tillat', 'markedsføringsmåling'],
    // polski
    ['Zezwalaj', 'analitykę', 'marketingową'],
    // português (Brasil)
    ['Permitir', 'mensuração', 'marketing'],
    // português (Portugal)
    ['Permitir', 'medição', 'marketing'],
    // română
    ['Permite', 'măsurarea', 'marketing'],
    // slovenčina
    ['Povoliť', 'meranie', 'marketingu'],
    // slovenščina
    ['Dovoli', 'merjenje', 'trženja'],
    // Somali
    ['Oggolow', 'cabbirka', 'suuqgeynta'],
    // suomi
    ['Salli', 'markkinoinnin', 'mittaus'],
    // svenska
    ['Tillåt', 'marknadsföringsmätning'],
    // Tiếng Việt
    ['phép', 'lường', 'marketing'],
    // Türkçe
    ['Pazarlama', 'ölçümüne', 'izin'],
    // Ελληνικά
    ['επιτρέπονται', 'μετρήσεις', 'μάρκετινγκ'],
    // български
    ['Разрешаване', 'измерването', 'ефективност'],
    // қазақ тілі
    ['Маркетинг', 'тиімділігін', 'рұқсат'],
    // русский
    ['Разрешить', 'маркетинговые', 'метрики'],
    // српски
    ['Дозволи', 'маркетиншко', 'мерење'],
    // українська
    ['Дозволити', 'ефективності', 'маркетингу'],
    // اردو
    ['مارکیٹنگ', 'پیمائش', 'اجازت'],
    // العربية
    ['السماح', 'بقياس', 'التسويقي'],
    // فارسی
    ['اجازه', 'سنجش', 'بازاریابی'],
    // አማርኛ
    ['የማስታወቂያ', 'ልኬትን', 'ፍቀድ'],
    // मराठी
    ['मार्केटिंग', 'मापनाला', 'अनुमती'],
    // हिन्दी
    ['मार्केटिंग', 'मेज़रमेंट', 'अनुमति'],
    // अनुमति
    ['মার্কেটিং', 'অ্যানালিটিক্স', 'অনুমোদন'],
    // ਪੰਜਾਬੀ
    ['ਮਾਰਕੀਟਿੰਗ', 'ਇਜਾਜ਼ਤ', 'ਦਿਓ'],
    // ગુજરાતી
    ['માર્કેટિંગ', 'માપનની', 'આપો'],
    // தமிழ்
    ['மார்க்கெட்டிங்', 'அளவீட்டை', 'அனுமதிக்கவும்'],
    // తెలుగు
    ['మార్కెటింగ్', 'కొలతను', 'అనుమతించు'],
    // ಕನ್ನಡ
    ['ಮಾರ್ಕೆಟಿಂಗ್', 'ಮಾಪನವನ್ನು', 'ಅನುಮತಿಸಿ'],
    // മലയാളം
    ['വിപണന', 'മൂല്യനിർണ്ണയം', 'അനുവദിക്കുക'],
    // ไทย
    ['വിപണന', 'മൂല്യനിർണ്ണയം', 'അനുവദിക്കുക'],
    // 한국어
    ['마케팅', '측정', '허용'],
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
    ['personalized', 'marketing'],
    // Albanian
    ['marketingun', 'personalizuar'],
    // Armenian
    ['Թույլատրել', 'անհատականացված', 'մարքեթինգը'],
    // Bahasa Melayu
    ['Benarkan', 'pemasaran', 'diperibadikan'],
    // bosanski
    ['Dozvoli', 'personalizirani', 'marketing'],
    // Burmese
    ['စိတ်ကြိုက်ပြုလုပ်ထားသော', 'စျေးကွက်ရှာဖွေရေးကို', 'ခွင့်ပြုရန်'],
    // català
    ['Permet', 'màrqueting', 'personalitzat'],
    // čeština
    ['Dovolit', 'personalizovaný', 'marketing'],
    // dansk
    ['Tillad', 'tilpasset', 'markedsføring'],
    // Deutsch
    ['Personalisiertes', 'Marketing', 'zulassen'],
    // eesti
    ['Luba', 'isikupärastatud', 'turundus'],
    // español (España)
    ['Permitir', 'marketing', 'personalizado'],
    // español (Latinoamérica)
    ['Permitir', 'marketing', 'personalizado'],
    // Filipino
    ['I-allow', 'naka-personalize', 'marketing'],
    // français (Canada)
    ['Autoriser', 'marketing', 'personnalisé'],
    // français (France)
    ['Autoriser', 'marketing', 'personnalisé'],
    // Georgian
    ['პერსონალიზებული', 'მარკეტინგის', 'დაშვება'],
    // hrvatski
    ['Dopusti', 'personalizirani', 'marketing'],
    // Icelandic
    ['Leyfa', 'sérsniðna', 'markaðssetningu'],
    // Indonesia
    ['Izinkan', 'Pemasaran', 'Dipersonalisasi'],
    // italiano
    ['Consenti', 'marketing', 'personalizzato'],
    // Kiswahili
    ['Ruhusu', 'matangazo', 'yaliyobinafsishwa'],
    // latviešu
    ['Atļaut', 'personalizētu', 'mārketingu'],
    // lietuvių
    ['Leisti', 'personalizuotą', 'rinkodarą'],
    // Macedonian
    ['Дозволи', 'персонализиран', 'маркетинг'],
    // magyar
    ['Személyre', 'marketing', 'engedélyezése'],
    // Mongolian
    ['тохирсон', 'маркетингийг', 'зөвшөөрөх'],
    // Nederlands
    ['Gepersonaliseerde', 'marketing', 'toestaan'],
    // norsk bokmål
    ['Tillat', 'persontilpasset', 'markedsføring'],
    // polski
    ['Zezwalaj', 'spersonalizowany', 'marketing'],
    // português (Brasil)
    ['Permitir', 'marketing', 'personalizado'],
    // português (Portugal)
    ['Permitir', 'marketing', 'personalizado'],
    // română
    ['Permite', 'marketingul', 'personalizat'],
    // slovenčina
    ['Povoliť', 'personalizovaný', 'marketing'],
    // slovenščina
    ['Dovoli', 'prilagojeno', 'trženje'],
    // Somali
    ['Oggolow', 'suuq-geyn', 'shakhsiyeeysan'],
    // suomi
    ['Salli', 'personoitu', 'markkinointi'],
    // svenska
    ['Tillåt', 'personlig', 'marknadsföring'],
    // Tiếng Việt
    ['phép', 'marketing', 'nhân'],
    // Türkçe
    ['Kişiselleştirilmiş', 'pazarlamaya', 'izin'],
    // Ελληνικά
    ['επιτρέπεται', 'εξατομικευμένο', 'μάρκετινγκ'],
    // български
    ['Разрешаване', 'персонализиран', 'маркетинг'],
    // қазақ тілі
    ['Жекелендірілген', 'маркетингке', 'рұқсат'],
    // русский
    ['Разрешить', 'персонализированный', 'маркетинг'],
    // српски
    ['Дозволи', 'персонализован', 'маркетинг'],
    // українська
    ['Дозволити', 'ефективності', 'маркетингу'],
    // اردو
    ['نوعیت', 'مارکیٹنگ', 'اجازت'],
    // العربية
    ['السماح', 'بالتسويق', 'المخصص'],
    // فارسی
    ['اجازه', 'بازاریابی', 'شخصی‌سازی‌شده'],
    // አማርኛ
    ['ግላዊ', 'ማስታወቂያ', 'ፍቀድ'],
    // मराठी
    ['वैयक्तिकृत', 'मार्केटिंगला', 'अनुमती'],
    // हिन्दी
    ['पर्सनलाइज़्ड', 'मार्केटिंग', 'अनुमति'],
    // अनुमति
    ['পার্সোনালাইজড', 'অনুমোদন', 'করুন'],
    // ਪੰਜਾਬੀ
    ['ਵਿਅਕਤੀਗਤ', 'ਮਾਰਕੀਟਿੰਗ', 'ਇਜਾਜ਼ਤ'],
    // ગુજરાતી
    ['પર્સનલાઇઝ', 'માર્કેટિંગને', 'આપો'],
    // தமிழ்
    ['பிரத்தியேக', 'மார்க்கெட்டிங்கை', 'அனுமதிக்கவும்'],
    // తెలుగు
    ['వ్యక్తిగతీకరించిన', 'మార్కెటింగ్‌ను', 'అనుమతించు'],
    // ಕನ್ನಡ
    ['ವೈಯಕ್ತೀಕರಿಸಿದ', 'ಮಾರ್ಕೆಟಿಂಗ್', 'ಅನುಮತಿಸಿ'],
    // മലയാളം
    ['വ്യക്തിപരമാക്കിയ', 'മാർക്കറ്റിംഗ്', 'അനുവദിക്കുക'],
    // 한국어
    ['맞춤형', '마케팅', '허용'],
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
type SwitchKind = keyof typeof TOGGLE_LABELS;

const selectorFor = (kind: SwitchKind): string =>
    `button[type="button"][role="switch"]:is(${
        TOGGLE_LABELS[kind]
            .map(l => l.map(item => `[aria-label*="${CSS.escape(item)}"]`))
            .join('')})`

// Extracts the user identifier from the `precise_location_identity` value in
// localStorage
const getPliUserId = (): string|undefined => {
  try {
    const stored = localStorage.getItem(PLI_USER_IDENTIFIER)
    if (!stored) {
      if (__DEV__) {
        logger.info(
            `No existing ${PLI_USER_IDENTIFIER} found in localStorage.`)
      }
      return undefined
    }

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed) || parsed.length !== 2) {
      if (__DEV__) { logger.error(`Unexpected format of ${PLI_USER_IDENTIFIER}:`, parsed) }
      return undefined
    }

    const userId = parsed[1]
    if (typeof userId !== 'string' || userId.length === 0) {
      if (__DEV__) { logger.error(`Invalid user identifier in ${PLI_USER_IDENTIFIER}.`) }
      return undefined
    }

    return userId
  } catch (error) {
    if (__DEV__) {
      logger.error(
          `Failed to parse ${PLI_USER_IDENTIFIER} from localStorage:`, error)
    }
    return undefined
  }
}

export class ChatgptUserScript extends UserScriptBase {
  readonly version = 6
  readonly includeUrlPatterns: string[] = ['https://chatgpt.com/*']
  readonly excludeUrlPatterns: string[] = []
  readonly userScript: string = 'user.js'
  readonly policyScript: string = 'policy.js'

  getUserId (): string|undefined {
    const nameFromCookie = this.getUserNameFromAuthInfoCookie()
    if (nameFromCookie) {
      if (__DEV__) logger.debug(`Extracted user name:${nameFromCookie}`)
      return nameFromCookie
    }

    const pliUserId = getPliUserId()
    if (pliUserId) {
      if (__DEV__) logger.debug(`Extracted pliUserId:${pliUserId}`)
      return pliUserId
    }

    const userElement = document.querySelector(USER_IDENTIFIER_SELECTOR)
    if (!userElement || !userElement.textContent) {
      if (__DEV__) {
        logger.error(`User identifier element not found for selector ${
            USER_IDENTIFIER_SELECTOR}.`)
      }
      return undefined
    }
    if (__DEV__) {
      logger.debug(
          `userElement.textContent:${userElement?.textContent ?? 'N/A'}`)
    }
    return userElement.textContent.trim() || undefined
  }

  private getUserNameFromAuthInfoCookie (): string|undefined {
    const prefix = `${AUTH_INFO_COOKIE_NAME}=`
    const rawCookie =
        document.cookie.split('; ').find(row => row.startsWith(prefix))
    if (!rawCookie) {
      return undefined
    }
    try {
      const value = rawCookie.slice(prefix.length)
      const data: AuthInfoCookie = JSON.parse(decodeURIComponent(value))
      const name = data.user?.name
      return typeof name === 'string' ? name.trim() || undefined : undefined
    } catch (error) {
      if (__DEV__) { logger.error(`Failed to parse ${AUTH_INFO_COOKIE_NAME} cookie:`, error) }
      return undefined
    }
  }

  protected getSiteScriptData ():
      Omit<UserScriptData, 'user_id'|'initial_execution'> {
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
