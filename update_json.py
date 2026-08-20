import json
import os

with open(r'c:\dev\blow-nights-app\frontend\src\i18n\locales\es.json', 'r', encoding='utf-8') as f:
    es = json.load(f)

with open(r'c:\dev\blow-nights-app\frontend\src\i18n\locales\ar.json', 'r', encoding='utf-8') as f:
    ar = json.load(f)

new_keys = {
  "landing": {
    "nav_venues": "الأماكن",
    "nav_rrpp": "العلاقات العامة (RRPP)",
    "active_now": "{{count}} أشخاص نشطين الآن",
    "live_city": "مباشر في مدينتك",
    "hero_desc_1": "مسارك الليلي LGTBIQ+ المباشر.",
    "hero_desc_2": "أماكن، تذاكر، تسجيل وصول وخطط حقيقية في مدينتك.",
    "enter_free": "دخول مجاني",
    "how_it_works": "كيف يعمل",
    "stat_venues": "أماكن",
    "stat_types": "أنواع الأماكن",
    "stat_tickets": "تذاكر رقمية",
    "what_is": "ما هو Blow Nights",
    "not_dating": "ليس تطبيق مواعدة.",
    "is_circuit": "إنه مسارك الليلي.",
    "about_desc": "يربط Blow Nights الأشخاص، الأماكن والفعاليات في الوقت الفعلي. سجل دخولك في مكانك، اشتر تذاكر بـ QR، واكتشف من يخرج الليلة — كل ذلك من تطبيق واحد.",
    "feat1_title": "أماكن حية",
    "feat1_desc": "حانات، نوادي، سهرات ما بعد الحفلات (Afters)، ساونا — انظر من يتواجد في كل مكان الآن.",
    "feat2_title": "تذاكر QR",
    "feat2_desc": "اشتر تذكرتك من التطبيق واعرضها عند الباب. بدون طوابير، بدون ورق.",
    "feat3_title": "تسجيل وصول ذكي",
    "feat3_desc": "عام، شبح أو مجهول. أنت تقرر كيف تظهر في كل مكان.",
    "feat4_title": "خريطة بالوقت الفعلي",
    "feat4_desc": "انظر من هو قريب وأي الأماكن بها جو الآن.",
    "feat5_title": "وضع التجوال (Cruising)",
    "feat5_desc": "تسجيل دخول مجهول، GPS ضبابي وصورة مخفية. خصوصية تامة لمناطق +18.",
    "feat6_title": "متعدد المدن",
    "feat6_desc": "مدريد، برشلونة، فالنسيا... Blow Nights يصل إلى كل مدينة بمسارها الخاص.",
    "steps_title": "ثلاث لمسات وأنت بالداخل",
    "step1_title": "أنشئ ملفك الشخصي",
    "step1_desc": "تسجيل الدخول بحساب Google، اسم مستعار وصورة. في 30 ثانية تكون بالداخل.",
    "step2_title": "استكشف مدينتك",
    "step2_desc": "انظر إلى الخريطة، اختر مكاناً وسجل وصولك بلمسة واحدة.",
    "step3_title": "اخرج واستمتع",
    "step3_desc": "اشتر التذاكر، تواصل مع الناس وعش الليلة.",
    "venue_types": "أنواع الأماكن",
    "venue_title": "من البداية إلى النهاية",
    "venue_desc": "كل نوع من الأماكن له وقته. ينظم Blow Nights ليلتك بأكملها.",
    "vtype_bars": "حانات / ما قبل الحفلة",
    "vtype_clubs": "نوادي",
    "vtype_afters": "Afters",
    "vtype_saunas": "ساونا",
    "vtype_cruising": "حانات التجوال (Cruising)",
    "vtype_outdoor": "مناطق خارجية",
    "b2b_tag": "للأماكن",
    "b2b_title": "هل تملك مكاناً LGTBIQ+؟",
    "b2b_desc": "يوفر لك Blow Nights لوحة إدارة كاملة: بيع التذاكر، إطلاق عروض ترويجية سريعة بالموقع، التحقق من الـ QR على الباب والتحكم في التدفق بالوقت الفعلي.",
    "b2b_panel": "لوحة تحكم المكان",
    "b2b_qr": "ماسح QR",
    "b2b_promos": "عروض سريعة (Flash)",
    "b2b_metrics": "مقاييس حية",
    "b2b_register": "سجل مكانك",
    "privacy_title": "خصوصية حقيقية",
    "privacy_desc": "ثلاثة أوضاع للظهور، GPS ضبابي في المناطق الحساسة، فلتر NSFW، ألبومات خاصة وتسجيل وصول مجهول. ليلتك، قواعدك.",
    "priv_public": "عام",
    "priv_public_desc": "ملفك الشخصي وصورتك مرئيان",
    "priv_ghost": "شبح",
    "priv_ghost_desc": "تصفح دون ترك أثر",
    "priv_anon": "مجهول",
    "priv_anon_desc": "تضيف فقط +1",
    "footer_business": "للأعمال",
    "footer_terms": "الشروط",
    "footer_privacy": "الخصوصية",
    "footer_rules": "القواعد"
  },
  "cookie": {
    "text": "نستخدم ملفات تعريف الارتباط الأساسية لعمل التطبيق وملفات تعريف الارتباط التحليلية لتحسين تجربتك. يمكنك قبول الجميع أو رفض غير الأساسية.",
    "reject": "الأساسية فقط",
    "accept": "قبول الكل"
  },
  "rrpp_nav": {
    "parties": "الحفلات",
    "qr_balance": "رصيد QR",
    "support": "الدعم",
    "account": "حسابي"
  },
  "admin_b2b": {
    "request_territory": "طلب منطقة",
    "opportunity_city_managers": "فرصة لمديري المدن (City Managers)",
    "operating_system": "نظام التشغيل",
    "lgtbiq_nightlife": "للحياة الليلية LGTBIQ+",
    "contact_team": "اتصل بالفريق",
    "view_business_model": "عرض نموذج العمل",
    "immediate_opportunities": "فرص فورية",
    "request_exclusivity": "طلب حصري",
    "four_engines_title": "المحركات الأربعة للمنصة",
    "economic_model": "النموذج الاقتصادي",
    "financial_projection": "التوقعات المالية السنوية",
    "launch_48h": "الإطلاق خلال 48 ساعة",
    "request_interview": "طلب مقابلة",
    "event_management": "إدارة الفعاليات",
    "new_event": "فعالية جديدة",
    "cancel": "إلغاء",
    "create_new_event": "إنشاء فعالية جديدة",
    "event_title": "عنوان الفعالية",
    "start_date_time": "تاريخ ووقت البدء",
    "create_event_and_generate_scanner": "إنشاء الفعالية وتوليد ماسح ضوئي",
    "sold_tickets": "التذاكر المباعة",
    "sales_catalog": "كتالوج المبيعات",
    "add_new_product": "إضافة منتج جديد",
    "create_product": "إنشاء منتج",
    "venue_profile": "الملف الشخصي للمكان",
    "official_name": "الاسم الرسمي",
    "description_bio": "الوصف / السيرة الذاتية",
    "physical_address": "العنوان الفعلي",
    "venue_type": "نوع المكان",
    "visibility": "الظهور",
    "save_configuration": "حفظ الإعدادات",
    "delete_point": "حذف النقطة"
  },
  "viewer_toast": {
    "live_activity": "نشاط مباشر!",
    "is_viewing": "يشاهد",
    "and_more_viewing": "و {{count}} آخرون يشاهدون"
  },
  "premium.monthly": "شهري",
  "premium.yearly": "سنوي",
  "premium.current_plan": "الخطة الحالية",
  "premium.manage": "إدارة"
}

final_ar = {}
for k, v in es.items():
    if isinstance(v, dict):
        final_ar[k] = {}
        for sub_k in v:
            if k in ar and sub_k in ar[k]:
                final_ar[k][sub_k] = ar[k][sub_k]
            else:
                final_ar[k][sub_k] = new_keys.get(k, {}).get(sub_k, "TRANSLATE_ME")
    else:
        if k in ar:
            final_ar[k] = ar[k]
        else:
            final_ar[k] = new_keys.get(k, "TRANSLATE_ME")

with open(r'c:\dev\blow-nights-app\frontend\src\i18n\locales\ar.json', 'w', encoding='utf-8') as f:
    json.dump(final_ar, f, ensure_ascii=False, indent=2)

print("done")
