export interface DonationResource {
  name: string;
  url: string;
  description?: string;
}

export const donationResources: Record<string, DonationResource[]> = {
  // 4. אוכל - תרומת מזון
  food: [
    { name: 'לקט ישראל (משולחן לשולחן)', url: 'https://www.leket.org/', description: 'בנק המזון ורשת הצלת המזון הגדולים בישראל' },
    { name: 'לתת', url: 'https://www.latet.org.il/', description: 'סיוע במזון לאוכלוסיות במצוקה וצמצום העוני' },
    { name: 'בית לחם יהודה', url: 'https://www.bly.org.il/', description: 'סיוע מזון ומוצרי ניקיון לאלפי משפחות' },
    { name: 'מזון לחיים', url: 'https://www.food-for-life.org/', description: 'הצלת מזון, אימוץ משפחות והאכלת נזקקים' },
    { name: 'יד עזרה ושולמית', url: 'https://yadezra.org.il/', description: 'חלוקת מזון למשפחות במצוקה ולחיילים' },
  ],
  // 3. ידע - חונכות ולימוד
  knowledge: [
    { name: 'פרח', url: 'https://www.perach.org.il/', description: 'חונכות סטודנטים לתלמידים' },
    { name: 'אל״ם', url: 'https://www.elem.org.il/', description: 'נוער במצוקה וסיכון' },
    { name: 'טלם', url: 'https://www.telem.org/', description: 'חונכות לילדי עולים' },
    { name: 'אבני דרך', url: 'https://www.avney-derech.org.il/', description: 'חונכות והכוונה' },
    { name: 'יד לכל', url: 'https://www.yadlakol.org.il/', description: 'שילוב אנשים עם מוגבלות' },
  ],

  // 6. בגדים - תרומת בגדים
  clothes: [
    { name: 'יד שרה', url: 'https://www.yadsarah.org.il/', description: 'תרומות וביגוד' },
    { name: 'פתחון לב', url: 'https://www.pitchonlev.org.il/', description: 'מרכזי סיוע וביגודיות' },
    { name: 'ויצו', url: 'https://wizo.org.il/', description: 'ביגודיות ותמיכה בקהילה' },
    { name: 'GoodWill', url: 'https://www.goodwill.org.il/', description: 'מחזור בגדים' },
    { name: 'חסדי נעמי', url: 'https://www.chasdei-naomi.org/', description: 'חלוקת בגדים ומזון' },
  ],

  // 7. ספרים - תרומת ספרים
  books: [
    { name: 'ספריית פיג׳מה', url: 'https://www.sifriyatpijama.org.il/', description: 'קידום קריאה לילדים' },
    { name: 'סיפור חוזר', url: 'https://www.rebooks.org.il/', description: 'תרומת ספרים ורכישה חברתית' },
    { name: 'אורט ישראל', url: 'https://www.ort.org.il/', description: 'תרומות לבתי ספר' },
    { name: 'תרומת ספרים לבתי חולים', url: 'https://ranweber.com/donate/', description: 'איסוף ספרים לבתי חולים' },
    { name: 'איגוד הספריות', url: 'https://www.library.org.il/', description: 'ספריות ציבוריות' },
  ],

  // 8. רהיטים - תרומת רהיטים
  furniture: [
    { name: 'יד שרה', url: 'https://www.yadsarah.org.il/', description: 'ריהוט וציוד רפואי' },
    { name: 'פתחון לב', url: 'https://www.pitchonlev.org.il/', description: 'סיוע וריהוט למשפחות' },
    { name: 'עמותת יש', url: 'https://www.yesh.org.il/', description: 'ריהוט לנזקקים' },
    { name: 'לתת', url: 'https://www.latet.org.il/', description: 'סיוע וחבילות דיור' },
    
  ],

  // 9. רפואה - עזרה רפואית
  medical: [
    { name: 'יד שרה', url: 'https://www.yadsarah.org.il/', description: 'השאלת ציוד רפואי' },
    { name: 'חברים לרפואה', url: 'https://www.haverim.org.il/', description: 'סיוע תרופות ומכשור' },
    { name: 'רפואה וחיים', url: 'https://refuah-vechaim.org.il/', description: 'תמיכה רפואית למשפחות' },
    { name: 'זכרון מנחם', url: 'https://www.zichron.org/', description: 'תמיכה בחולי סרטן ומשפחותיהם' },
    { name: 'עזר מציון', url: 'https://www.ezer-mizion.org.il/', description: 'בנק מח עצם ושירותים רפואיים' },
  ],

  // 10. חיות - עזרה לחיות
  animals: [
    { name: 'SPCA ישראל', url: 'https://spca.co.il/', description: 'עמותת צער בעלי חיים' },
    { name: 'תנו לחיות לחיות', url: 'https://www.letlive.org.il/', description: 'הצלה ואימוץ' },
    { name: 'SOS חיות', url: 'https://sospets.co.il/', description: 'הצלה, אימוץ וטיפול' },
    { name: 'הכל חי', url: 'https://www.hakol-chai.org.il/', description: 'זכויות בעלי חיים' },
    
  ],

  // 11. דיור - עזרה בדיור
  housing: [
    { name: 'אל״ם', url: 'https://www.elem.org.il/', description: 'בתי מחסה לנוער' },
    { name: 'בת מלך', url: 'https://www.batmelech.org/', description: 'מקלטים לנשים וילדים' },
    { name: 'ויצו', url: 'https://www.wizo.org.il/', description: 'מקלטים ותמיכה לנשים' },
    { name: 'לתת', url: 'https://www.latet.org.il/', description: 'סיוע למשפחות במצוקה' },
    { name: 'לחיות בכבוד', url: 'https://l-b.org.il/', description: 'סיוע לניצולי שואה' },
  ],

  // 12. תמיכה - תמיכה נפשית
  support: [
    { name: 'ער״ן', url: 'https://www.eran.org.il/', description: 'קו חם ארצי' },
    { name: 'סה״ר', url: 'https://www.sahar.org.il/', description: 'סיוע ומניעת התאבדויות' },
    { name: 'נט״ל', url: 'https://www.natal.org.il/', description: 'טראומה לאומית' },
    { name: 'אנוש', url: 'https://www.enosh.org.il/', description: 'בריאות הנפש' },
    { name: 'אל״ם', url: 'https://www.elem.org.il/', description: 'נוער במצוקה' },
  ],

  // 13. חינוך - עזרה בלימודים
  education: [
    { name: 'פרח', url: 'https://www.perach.org.il/', description: 'חונכות אקדמית' },
    { name: 'ידיד לחינוך', url: 'https://www.yadidlechinuch.org.il/', description: 'התנדבות גמלאים בבתי ספר' },
    { name: 'אורט ישראל', url: 'https://www.ort.org.il/', description: 'תמיכה חינוכית' },
    { name: 'טלם', url: 'https://www.telem.org/', description: 'עזרה לעולים' },
    { name: 'אבני דרך', url: 'https://www.avney-derech.org.il/', description: 'ליווי חינוכי' },
  ],

  // 14. סביבה - פרויקטים ירוקים
  environment: [
    { name: 'המשרד להגנת הסביבה', url: 'https://www.sviva.gov.il/', description: 'מידע ותוכניות' },
    { name: 'החברה להגנת הטבע', url: 'https://www.teva.org.il/', description: 'טבע ושביל ישראל' },
    { name: 'אדם טבע ודין', url: 'https://www.adamteva.org.il/', description: 'משפט וסביבה' },
    { name: 'גרינפיס ישראל', url: 'https://www.greenpeace.org/israel/', description: 'מאבק סביבתי' },
    { name: 'צלול', url: 'https://www.zalul.org.il/', description: 'איכות הסביבה הימית' },
  ],

  technology: [
    { name: 'BeGifted', url: 'https://www.begifted.org/', description: 'התנדבות טכנולוגית' },
    { name: 'שלום דיגיטלי', url: 'https://www.digitalpeace.org.il/', description: 'חוסן דיגיטלי' },
    { name: 'צופן', url: 'https://www.tzofen.org.il/', description: 'קידום מיעוטים בהייטק' },
    { name: 'Code for Good', url: 'https://www.code4good.org.il/', description: 'פרויקטים לקהילה' },
    { name: 'Tech Career', url: 'https://www.tech-career.org/', description: 'הכשרה טכנולוגית' },
  ],

  time: [
    { name: 'רוח טובה', url: 'https://www.ruachtova.org.il/', description: 'מאגר הזדמנויות התנדבות' },
    { name: 'המועצה הישראלית להתנדבות', url: 'https://ivolunteer.org.il/', description: 'פרויקטים ויוזמות התנדבות' },
    { name: 'לתת - התנדבות', url: 'https://www.latet.org.il/volunteering/', description: 'התנדבות וסיוע הומניטרי' },
    { name: 'מד"א - מתנדבים', url: 'https://www.mdais.org/volunteers', description: 'התנדבות בחירום ורפואה' },
    { name: 'IsraAID - התנדבות', url: 'https://www.israelaid.org.il/volunteer', description: 'סיוע הומניטרי בינלאומי' },
    { name: 'רק חיוך', url: 'https://www.rakchiyuch.org.il/', description: 'עזרה לילדים חולי סרטן' },
    { name: 'שירות לאומי - האגודה להתנדבות', url: 'https://sherut-leumi.co.il/', description: 'התנדבות ושירות בקהילה' },
    { name: 'Gifted', url: 'https://www.begifted.org/', description: 'התנדבות בכישורים מקצועיים' },
  ],
};


