import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useAppContext } from "./AppContext";
import BackHeader from "./BackHeader";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Lang = "English" | "French" | "Arabic";

// ─── Disease type ──────────────────────────────────────────────────────────────
type Disease = {
  icon: string;
  name: string;
  severity: string;
  severityColor: string;
  severityBg: string;
  description: string;
  sensorSignals: string;
  whatToDo: string;
  symptoms: string[];
};

// ─── Diseases data ─────────────────────────────────────────────────────────────
const DISEASES: Record<Lang, Disease[]> = {
  English: [
    {
      icon: "🔴", name: "Varroa Mite", severity: "Critical",
      severityColor: "#8B0000", severityBg: "#FFF0F0",
      description: "A parasitic mite (Varroa destructor) that feeds on bee fat bodies and transmits deadly viruses. It is the #1 threat to honeybee colonies worldwide — it can destroy an untreated colony within 2–3 years.",
      sensorSignals: "📉 Gradual weight loss over weeks\n🔊 Declining sound activity as population falls\n⚠️ Sudden colony population drop in late summer",
      whatToDo: "• Apply oxalic acid or formic acid treatments (approved acaricides).\n• Count mites using an alcohol wash test — above 3 mites per 100 bees means treat immediately.\n• Inspect brood frames for white dots on pupae (varroa feeding sites).\n• Use drone brood removal in spring to reduce mite reproduction.\n• Treat after honey harvest to protect winter bees.",
      symptoms: ["Weight drop", "Low colony sound", "Deformed wings"],
    },
    {
      icon: "🟠", name: "American Foulbrood (AFB)", severity: "High — Notifiable disease",
      severityColor: "#B34700", severityBg: "#FFF4F0",
      description: "A highly contagious bacterial disease (Paenibacillus larvae) that kills sealed brood. Spores survive 40+ years in wood and wax. It is legally notifiable in most countries.",
      sensorSignals: "🔊 Abnormal hive sounds as brood population collapses\n⚖️ Sudden or gradual weight drop\n📉 Weak or absent foraging activity",
      whatToDo: "• DO NOT attempt to treat — there is no safe treatment.\n• Burn infected hives and all wooden equipment immediately.\n• Report to your local beekeeping authority — it is mandatory.\n• Disinfect all tools with a blowtorch or 10% bleach solution.\n• Inspect neighbouring hives as spores spread easily.",
      symptoms: ["Sunken discoloured cappings", "Ropy brown brood", "Strong rotten smell"],
    },
    {
      icon: "🟡", name: "Nosema", severity: "Warning",
      severityColor: "#7A5A00", severityBg: "#FFFBF0",
      description: "A microsporidian gut infection (Nosema ceranae / apis) that shortens bee lifespan and causes spring dwindle syndrome. Nosema ceranae is dangerous because it shows no obvious dysentery symptoms.",
      sensorSignals: "⚖️ Lower hive weight in spring despite mild weather\n🔊 Reduced sound activity — fewer foragers returning\n📉 Colony fails to build up normally after winter",
      whatToDo: "• Ensure dry wintering conditions — moisture worsens the disease.\n• Replace old dark combs every 3 years.\n• Use Fumagillin where permitted by law.\n• Ensure adequate pollen stores to support bee immune response.\n• Requeen with hygienic stock if the problem recurs annually.",
      symptoms: ["Spring population crash", "Crawling bees near entrance", "Dysentery spots on hive front"],
    },
    {
      icon: "🔵", name: "Chalkbrood", severity: "Moderate",
      severityColor: "#1A4080", severityBg: "#F0F4FF",
      description: "A fungal disease (Ascosphaera apis) that mummifies bee larvae into hard chalk-like pellets visible at the hive entrance. Thrives in cold, damp conditions — more common in early spring.",
      sensorSignals: "⚖️ Weight drops as brood area shrinks\n💧 High humidity readings sustained above 75%\n🔊 Sound may drop if a large brood area is lost",
      whatToDo: "• Improve hive ventilation — add a ventilation board or open the entrance.\n• Tilt the hive slightly forward so rainwater drains away.\n• Replace the queen with a hygienic-trait queen.\n• Remove chalk mummies from the entrance and bottom board manually.\n• Reduce the entrance in cold weather to help bees maintain warmth.",
      symptoms: ["White/grey chalk pellets at entrance", "High hive humidity", "Patchy brood pattern"],
    },
    {
      icon: "🟢", name: "European Foulbrood (EFB)", severity: "Moderate",
      severityColor: "#145A2E", severityBg: "#F0FFF4",
      description: "A bacterial infection (Melissococcus plutonius) affecting unsealed larvae, usually in spring when colony demand outpaces pollen supply. Less severe than AFB but still weakens colonies significantly.",
      sensorSignals: "📉 Subtle weight decline especially in spring\n🔊 Minor but sustained drop in sound activity\n⚠️ Patchy brood pattern visible on inspection",
      whatToDo: "• Strengthen the colony by adding frames of sealed healthy brood.\n• Requeen with a hygienic or disease-resistant breed.\n• Ensure abundant pollen sources — hungry colonies are most at risk.\n• Oxytetracycline is licensed in some countries — check local regulations.\n• Improve nutrition with pollen supplements if natural forage is scarce.",
      symptoms: ["Twisted/melted-looking larvae", "Sour fermented smell", "Patchy unsealed brood"],
    },
    {
      icon: "🟣", name: "Sacbrood", severity: "Low — usually self-limiting",
      severityColor: "#4A1F9E", severityBg: "#F5F0FF",
      description: "A viral disease (Sacbrood virus) that turns larvae into fluid-filled sacs shaped like a gondola. Most strong colonies suppress it naturally within a few weeks without intervention.",
      sensorSignals: "📉 Minor weight and sound variations\n⚠️ Watch for a sustained downward trend in late spring\n🔊 No major sound change expected unless widespread",
      whatToDo: "• Monitor closely — most colonies recover on their own within 2–3 weeks.\n• Requeen if the problem persists or the colony is weakening.\n• Ensure adequate nutrition — pollen and a good nectar flow help recovery.\n• No approved chemical treatment is available.\n• Keep the colony population strong so hygienic bees can clean out infected cells.",
      symptoms: ["Fluid-filled sac around dead larva", "Gondola-shaped larvae", "Bees usually remove them quickly"],
    },
  ],
  French: [
    {
      icon: "🔴", name: "Varroa", severity: "Critique",
      severityColor: "#8B0000", severityBg: "#FFF0F0",
      description: "Un acarien parasite (Varroa destructor) qui se nourrit des corps gras des abeilles et transmet des virus mortels. Principale menace mondiale — peut détruire une colonie non traitée en 2–3 ans.",
      sensorSignals: "📉 Perte de poids progressive sur plusieurs semaines\n🔊 Baisse de l'activité sonore avec la population\n⚠️ Chute soudaine de la population en fin d'été",
      whatToDo: "• Appliquer des traitements à l'acide oxalique ou formique.\n• Compter les varroas par lavage à l'alcool — >3/100 abeilles = traiter immédiatement.\n• Inspecter les cadres de couvain (points blancs sur nymphes).\n• Retirer le couvain de faux-bourdons au printemps.\n• Traiter après la récolte du miel pour protéger les abeilles d'hiver.",
      symptoms: ["Perte de poids", "Son faible", "Ailes déformées"],
    },
    {
      icon: "🟠", name: "Loque américaine (AFB)", severity: "Élevé — Déclaration obligatoire",
      severityColor: "#B34700", severityBg: "#FFF4F0",
      description: "Maladie bactérienne très contagieuse (Paenibacillus larvae) tuant le couvain operculé. Les spores survivent 40+ ans. Déclaration obligatoire dans la plupart des pays.",
      sensorSignals: "🔊 Sons anormaux lorsque la population s'effondre\n⚖️ Chute de poids soudaine ou progressive\n📉 Activité de butinage faible ou absente",
      whatToDo: "• NE PAS traiter — il n'existe pas de traitement sûr.\n• Brûler les ruches infectées et tout le matériel immédiatement.\n• Déclarer aux autorités apicoles locales — c'est obligatoire.\n• Désinfecter tous les outils (flamme ou solution de Javel à 10%).\n• Inspecter les ruches voisines.",
      symptoms: ["Opercules enfoncés décolorés", "Couvain filant", "Forte odeur de putréfaction"],
    },
    {
      icon: "🟡", name: "Nosémose", severity: "Avertissement",
      severityColor: "#7A5A00", severityBg: "#FFFBF0",
      description: "Infection microsporidienne de l'intestin (Nosema ceranae / apis) causant le syndrome de dépopulation printanière. Nosema ceranae est particulièrement dangereuse car elle ne présente pas toujours de dysenterie visible.",
      sensorSignals: "⚖️ Poids plus faible au printemps malgré un temps doux\n🔊 Activité sonore réduite — moins de butineuses\n📉 La colonie ne reconstitue pas normalement après l'hiver",
      whatToDo: "• Assurer des conditions d'hivernage sèches.\n• Renouveler les vieux rayons tous les 3 ans.\n• Fumagilline si autorisée localement.\n• Garantir des réserves de pollen suffisantes.\n• Renouveler la reine avec une souche hygiénique si le problème revient.",
      symptoms: ["Effondrement printanier", "Abeilles rampantes à l'entrée", "Traces de dysenterie"],
    },
    {
      icon: "🔵", name: "Couvain plâtré", severity: "Modéré",
      severityColor: "#1A4080", severityBg: "#F0F4FF",
      description: "Maladie fongique (Ascosphaera apis) momifiant les larves en granules crayeux visibles à l'entrée. Prospère dans les conditions froides et humides.",
      sensorSignals: "⚖️ Perte de poids quand la zone de couvain diminue\n💧 Humidité élevée soutenue au-dessus de 75%\n🔊 Baisse sonore si une grande partie du couvain est perdue",
      whatToDo: "• Améliorer la ventilation — ajouter une planche de ventilation.\n• Incliner légèrement la ruche vers l'avant.\n• Remplacer la reine par une reine à traits hygiéniques.\n• Retirer manuellement les momies de l'entrée.\n• Réduire l'entrée par temps froid.",
      symptoms: ["Granules blancs/gris à l'entrée", "Humidité élevée", "Couvain irrégulier"],
    },
    {
      icon: "🟢", name: "Loque européenne (EFB)", severity: "Modéré",
      severityColor: "#145A2E", severityBg: "#F0FFF4",
      description: "Infection bactérienne (Melissococcus plutonius) affectant les larves non operculées, surtout au printemps. Moins grave que la loque américaine mais affaiblit la colonie.",
      sensorSignals: "📉 Légère baisse de poids surtout au printemps\n🔊 Légère mais soutenue baisse de l'activité sonore\n⚠️ Couvain irrégulier visible à l'inspection",
      whatToDo: "• Renforcer la colonie avec des cadres de couvain sain.\n• Remplacer la reine par une race hygiénique.\n• Assurer de bonnes sources de pollen.\n• Oxytétracycline autorisée dans certains pays — vérifier.\n• Améliorer la nutrition avec des suppléments si nécessaire.",
      symptoms: ["Larves tordues ou fondues", "Odeur aigre fermentée", "Couvain ouvert irrégulier"],
    },
    {
      icon: "🟣", name: "Couvain sacciforme", severity: "Faible — généralement autolimitant",
      severityColor: "#4A1F9E", severityBg: "#F5F0FF",
      description: "Maladie virale (Sacbrood virus) transformant les larves en sacs remplis de liquide. La plupart des colonies fortes s'en remettent naturellement en quelques semaines.",
      sensorSignals: "📉 Légères variations de poids et de son\n⚠️ Surveiller une tendance baissière prolongée fin printemps\n🔊 Pas de changement sonore majeur sauf cas généralisé",
      whatToDo: "• Observer — la plupart des colonies guérissent seules en 2–3 semaines.\n• Remplacer la reine si le problème persiste.\n• Assurer une bonne nutrition.\n• Pas de traitement chimique autorisé disponible.\n• Maintenir une population forte.",
      symptoms: ["Sac de liquide autour de la larve", "Larves en forme de gondole", "Les abeilles les éliminent rapidement"],
    },
  ],
  Arabic: [
    {
      icon: "🔴", name: "حلم الفاروا", severity: "حرج",
      severityColor: "#8B0000", severityBg: "#FFF0F0",
      description: "طفيل حشري (Varroa destructor) يتغذى على جسم النحل ويُعدّي فيروسات قاتلة. التهديد الأول لمستعمرات النحل عالمياً — يمكنه تدمير مستعمرة غير معالجة في 2–3 سنوات.",
      sensorSignals: "📉 فقدان تدريجي في الوزن على مدى أسابيع\n🔊 انخفاض النشاط الصوتي مع تراجع الأعداد\n⚠️ انخفاض مفاجئ في عدد النحل أواخر الصيف",
      whatToDo: "• استخدم حمض الأوكساليك أو الفورميك.\n• افحص مستوى الإصابة بغسيل الكحول — أعلى من 3/100 نحلة = علّج فوراً.\n• افحص إطارات الحضنة عن نقاط بيضاء على الشرانق.\n• أزل حضنة الذكور ربيعاً.\n• عالج بعد حصاد العسل لحماية نحل الشتاء.",
      symptoms: ["انخفاض الوزن", "صوت منخفض", "أجنحة مشوهة"],
    },
    {
      icon: "🟠", name: "تعفن الحضنة الأمريكي (AFB)", severity: "عالٍ — إبلاغ إلزامي",
      severityColor: "#B34700", severityBg: "#FFF4F0",
      description: "مرض بكتيري شديد العدوى (Paenibacillus larvae) يقتل الحضنة المغلقة. تبقى الجراثيم حية 40+ سنة. يُعدّ من الأمراض الواجب الإبلاغ عنها قانوناً.",
      sensorSignals: "🔊 أصوات غير طبيعية مع انهيار أعداد الحضنة\n⚖️ انخفاض مفاجئ أو تدريجي في الوزن\n📉 ضعف أو غياب نشاط رحلات الجمع",
      whatToDo: "• لا تحاول العلاج — لا يوجد علاج آمن.\n• أحرق الخلايا المصابة وكل المعدات الخشبية فوراً.\n• أبلغ السلطات الزراعية المحلية — هذا إلزامي قانونياً.\n• عقّم كل الأدوات (لهب أو محلول كلور 10%).\n• افحص الخلايا المجاورة.",
      symptoms: ["أغطية غائرة متغيرة اللون", "حضنة لزجة كالكراميل", "رائحة نتنة شديدة"],
    },
    {
      icon: "🟡", name: "النوزيما", severity: "تحذير",
      severityColor: "#7A5A00", severityBg: "#FFFBF0",
      description: "إصابة فطرية في أمعاء النحل (Nosema ceranae / apis) تُقصّر عمر النحل وتسبب تضاؤل المستعمرة ربيعاً. النوزيما السيرانية خطيرة لأنها لا تُظهر دائماً أعراض الإسهال.",
      sensorSignals: "⚖️ انخفاض الوزن ربيعاً رغم الطقس المعتدل\n🔊 تراجع النشاط الصوتي — قلة الجامعات\n📉 المستعمرة لا تنمو بشكل طبيعي بعد الشتاء",
      whatToDo: "• حافظ على بيئة شتوية جافة.\n• استبدل الشمع القديم الداكن كل 3 سنوات.\n• استخدم Fumagillin حيث يسمح القانون.\n• وفّر مخزوناً كافياً من حبوب اللقاح.\n• أبدل الملكة بسلالة نظيفة إذا تكرر المشكلة.",
      symptoms: ["انهيار ربيعي في الأعداد", "نحل زاحف عند المدخل", "آثار إسهال على الخلية"],
    },
    {
      icon: "🔵", name: "الحضنة الجيرية", severity: "متوسط",
      severityColor: "#1A4080", severityBg: "#F0F4FF",
      description: "مرض فطري (Ascosphaera apis) يحوّل اليرقات إلى حبيبات جيرية صلبة تظهر عند مدخل الخلية. يزدهر في الأجواء الباردة الرطبة.",
      sensorSignals: "⚖️ انخفاض الوزن مع تقلص منطقة الحضنة\n💧 رطوبة مرتفعة باستمرار فوق 75%\n🔊 تراجع الصوت إن تضررت مساحة حضنة كبيرة",
      whatToDo: "• حسّن التهوية — أضف لوحة تهوية أو وسّع المدخل.\n• ميّل الخلية قليلاً للأمام لتصريف المياه.\n• استبدل الملكة بأخرى ذات صفة نظافة عالية.\n• أزل الحبيبات الجيرية يدوياً من المدخل.\n• ضيّق المدخل في الطقس البارد.",
      symptoms: ["حبيبات بيضاء/رمادية عند المدخل", "رطوبة عالية", "نمط حضنة متقطع"],
    },
    {
      icon: "🟢", name: "تعفن الحضنة الأوروبي (EFB)", severity: "متوسط",
      severityColor: "#145A2E", severityBg: "#F0FFF4",
      description: "إصابة بكتيرية (Melissococcus plutonius) تطال اليرقات المفتوحة، تكثر ربيعاً. أقل خطورة من الأمريكي لكنه يُضعف المستعمرة.",
      sensorSignals: "📉 انخفاض طفيف في الوزن خاصةً ربيعاً\n🔊 تراجع صوتي خفيف ومستمر\n⚠️ نمط حضنة غير منتظم عند الفحص",
      whatToDo: "• قوّ المستعمرة بإطارات حضنة مغلقة سليمة.\n• أبدل الملكة بسلالة ذات مناعة.\n• وفّر مصادر لقاح وفيرة.\n• Oxytetracycline مسموح في بعض الدول — تحقق.\n• أضف مكملات حبوب اللقاح إن كان الرعي شحيحاً.",
      symptoms: ["يرقات ملتوية أو ذائبة", "رائحة حامضة مخمّرة", "حضنة مفتوحة متقطعة"],
    },
    {
      icon: "🟣", name: "الحضنة الكيسية", severity: "منخفض — عادةً يتوقف وحده",
      severityColor: "#4A1F9E", severityBg: "#F5F0FF",
      description: "مرض فيروسي (Sacbrood virus) يحوّل اليرقات إلى أكياس ممتلئة بالسائل. معظم المستعمرات القوية تتغلب عليه طبيعياً خلال أسابيع.",
      sensorSignals: "📉 تفاوتات بسيطة في الوزن والصوت\n⚠️ راقب انخفاضاً مستمراً في أواخر الربيع\n🔊 لا تغيير صوتي كبير ما لم يكن الانتشار واسعاً",
      whatToDo: "• راقب — معظم المستعمرات تتعافى وحدها في 2–3 أسابيع.\n• أبدل الملكة إن استمر المرض أو تراجعت المستعمرة.\n• وفّر تغذية جيدة — اللقاح وتدفق الرحيق يدعمان التعافي.\n• لا علاج كيميائي معتمد متاح.\n• حافظ على كثافة عالية للمستعمرة.",
      symptoms: ["كيس سائل حول اليرقة الميتة", "يرقات شكل قارب", "النحل عادةً يُزيلها بسرعة"],
    },
  ],
};

// ─── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ_DATA: Record<Lang, { q: string; a: string }[]> = {
  English: [
    { q: "How do I add a hive to the app?", a: "Tap the yellow + button at the bottom-right of the dashboard. The app will search for the next hive in sequence (Hive 1, Hive 2…). Make sure the sensor device is powered on and connected to Wi-Fi before tapping." },
    // ✅ FIXED: removed 5-hive limit and device sentence
    { q: "Can I monitor more than one hive?", a: "Yes. Smart Bee supports unlimited hives per account." },
    { q: "What do the 3 alert levels mean?", a: "⚠️ WARNING — 1 anomaly detected. Monitor the situation.\n🔴 HIGH — 2 anomalies at the same time. Inspect within 24 hours.\n🚨 CRITICAL — 3 or more anomalies, or an intruder detected. Inspect immediately." },
    { q: "How do I change the app language?", a: "Open the side menu (≡) → tap Language → choose English, French, or Arabic. All app text including alerts and notifications will update instantly." },
    { q: "How do I turn off a specific type of notification?", a: "Open the side menu → Notifications. You can disable all notifications with the master toggle, or turn off individual types: danger alerts, sound alerts, temperature alerts, or humidity alerts." },
    { q: "How do I change my name, email, or password?", a: "Open the side menu → Account. Tap 'Change name', 'Change email', or 'Change password'. Your new credentials will be saved and used the next time you log in." },
    { q: "What does the Statistics chart show?", a: "The chart shows the last 7 days of weight (kg), temperature (°C), and humidity (%) for the selected hive. Month and year views will be available in a future update." },
    { q: "What do I do if a hive is not found?", a: "Check that:\n• The sensor device is powered on (LED indicator is lit).\n• It is connected to Wi-Fi (signal LED is on).\n• The hive name in Firebase matches exactly 'Hive 1', 'Hive 2', etc. (case-sensitive)." },
    { q: "What is the normal temperature inside a hive?", a: "A healthy colony maintains 32–36°C inside the brood area year-round. Above 38°C is an early warning. Above 40°C stresses the brood. Above 42°C causes irreversible brood damage — ventilate immediately." },
    { q: "What is a normal humidity level?", a: "Optimal humidity is 50–70%. Above 80% promotes mold and disease. Above 85% is critical — improve ventilation immediately and check for water leaks near the hive." },
    { q: "What does the hive weight tell me?", a: "Weight is one of the most useful indicators:\n• Steady increase → active nectar flow, good production.\n• Sudden drop > 1 kg overnight → swarming may have occurred.\n• Gradual decrease in winter → normal food consumption.\n• No change in summer → colony may not be foraging." },
    // ✅ FIXED: added unit clarification "on a scale of 0.0 to 1.0 units"
    { q: "What does abnormal bee sound mean?", a: "The sensor measures sound level on a scale of 0.0 to 1.0 units. Normal activity is between 0.40 and 0.70 units.\n• Below 0.40 units → colony is unusually quiet. Check for queen loss or pesticide exposure.\n• Above 0.70 units → colony is agitated. Swarming may occur within 12–24 hours. Inspect for queen cells." },
    // ✅ FIXED: added unit in swarming signs
    { q: "What is swarming and how can I prevent it?", a: "Swarming is when the old queen leaves with half the colony to start a new hive. Signs: loud buzzing spike (sound above 0.70 units), weight drop > 1 kg, many bees clustering outside.\n\nPrevention:\n• Add a super before the hive becomes overcrowded.\n• Check for and remove queen cells.\n• Ensure the hive has good ventilation in hot weather." },
    { q: "What does an intruder alert mean?", a: "The sensor detected unusual vibrations or motion at the hive entrance — typically a hornet, wasp, or small mammal.\n\nWhat to do:\n• Inspect the entrance immediately.\n• Look for dead bees or unusual damage near the entry.\n• Consider installing an entrance reducer to protect the colony." },
    { q: "How often should I inspect my hive?", a: "• Spring & summer: at least once a week.\n• Autumn: every 2 weeks to check food stores.\n• Winter: avoid opening the hive. Monitor via the app only.\n\nAlways inspect on a warm, calm, sunny day when bees are actively foraging." },
    { q: "How do I prepare my hive for winter?", a: "• Ensure the colony has at least 15–20 kg of honey stores.\n• Reduce the hive entrance to prevent cold drafts and mice.\n• Insulate the top of the hive.\n• Treat for Varroa mites in late summer/early autumn.\n• Monitor weight weekly through the app — a sharp drop means the colony is starving." },
  ],
  French: [
    { q: "Comment ajouter une ruche dans l'application ?", a: "Appuyez sur le bouton jaune + en bas à droite du tableau de bord. L'application recherche la prochaine ruche en séquence (Ruche 1, Ruche 2…). Assurez-vous que le capteur est allumé et connecté au Wi-Fi avant d'appuyer." },
    // ✅ FIXED: removed 5-hive limit and device sentence
    { q: "Puis-je surveiller plusieurs ruches ?", a: "Oui. Smart Bee prend en charge un nombre illimité de ruches par compte." },
    { q: "Que signifient les 3 niveaux d'alerte ?", a: "⚠️ AVERTISSEMENT — 1 anomalie. Surveillez la situation.\n🔴 ÉLEVÉ — 2 anomalies simultanées. Inspectez dans les 24 heures.\n🚨 CRITIQUE — 3 anomalies ou plus, ou intrus détecté. Inspectez immédiatement." },
    { q: "Comment changer la langue de l'application ?", a: "Ouvrez le menu latéral (≡) → Langue → choisissez Anglais, Français ou Arabe. Tous les textes y compris les alertes et notifications se mettent à jour instantanément." },
    { q: "Comment désactiver un type de notification ?", a: "Ouvrez le menu → Notifications. Désactivez toutes les notifications avec le bouton principal, ou désactivez individuellement : alertes de danger, alertes sonores, température ou humidité." },
    { q: "Comment modifier mon nom, email ou mot de passe ?", a: "Ouvrez le menu → Compte. Appuyez sur 'Changer le nom', 'Changer l'email' ou 'Changer le mot de passe'. Vos nouvelles informations seront utilisées à la prochaine connexion." },
    { q: "Que montre le graphique Statistiques ?", a: "Le graphique affiche les 7 derniers jours de poids (kg), température (°C) et humidité (%) pour la ruche sélectionnée. Les vues mois et année seront disponibles dans une mise à jour future." },
    { q: "Que faire si une ruche n'est pas trouvée ?", a: "Vérifiez que :\n• Le capteur est allumé (voyant LED allumé).\n• Il est connecté au Wi-Fi (voyant signal allumé).\n• Le nom dans Firebase correspond exactement à 'Hive 1', 'Hive 2', etc. (sensible à la casse)." },
    { q: "Quelle est la température normale dans une ruche ?", a: "Une colonie saine maintient 32–36°C dans la zone de couvain. Au-dessus de 38°C : signal précoce. Au-dessus de 40°C : stress du couvain. Au-dessus de 42°C : dommages irréversibles — ventilez immédiatement." },
    { q: "Quel est le niveau d'humidité normal ?", a: "L'humidité optimale est de 50–70%. Au-dessus de 80% : risque de moisissures. Au-dessus de 85% : critique — améliorez la ventilation immédiatement et vérifiez les infiltrations d'eau." },
    { q: "Que m'indique le poids de la ruche ?", a: "Le poids est un indicateur précieux :\n• Augmentation constante → flux de nectar actif.\n• Chute soudaine > 1 kg en une nuit → essaimage probable.\n• Diminution progressive en hiver → consommation normale.\n• Aucun changement en été → la colonie ne butine peut-être pas." },
    // ✅ FIXED: added unit clarification
    { q: "Que signifie un son anormal ?", a: "Le capteur mesure le niveau sonore sur une échelle de 0,0 à 1,0 unité. Niveau normal : entre 0,40 et 0,70 unité.\n• Inférieur à 0,40 unité → colonie anormalement silencieuse. Vérifiez la reine.\n• Supérieur à 0,70 unité → colonie agitée. Essaimage possible dans 12–24 h. Inspectez les cellules royales." },
    // ✅ FIXED: added unit in swarming signs
    { q: "Qu'est-ce que l'essaimage et comment le prévenir ?", a: "L'essaimage est le départ de la vieille reine avec la moitié de la colonie. Signes : pic sonore (au-dessus de 0,70 unité), chute de poids > 1 kg, abeilles en grappes à l'extérieur.\n\nPrévention :\n• Ajoutez une hausse avant surpopulation.\n• Retirez les cellules royales.\n• Assurez une bonne ventilation." },
    { q: "Que signifie une alerte intrusion ?", a: "Le capteur a détecté des vibrations inhabituelles à l'entrée — frelon, guêpe ou petit mammifère.\n\nÀ faire :\n• Inspectez l'entrée immédiatement.\n• Cherchez des abeilles mortes ou des dégâts.\n• Installez un réducteur d'entrée." },
    { q: "À quelle fréquence inspecter ma ruche ?", a: "• Printemps & été : au moins une fois par semaine.\n• Automne : toutes les 2 semaines.\n• Hiver : n'ouvrez pas la ruche. Surveillez via l'application.\n\nInspectez toujours par temps chaud, calme et ensoleillé." },
    { q: "Comment préparer la ruche pour l'hiver ?", a: "• Assurez au moins 15–20 kg de réserves de miel.\n• Réduisez l'entrée contre le froid et les souris.\n• Isolez le dessus de la ruche.\n• Traitez contre le Varroa fin été/début automne.\n• Surveillez le poids hebdomadairement — une chute brutale signifie une famine." },
  ],
  Arabic: [
    { q: "كيف أضيف خلية في التطبيق؟", a: "اضغط على زر + الأصفر في أسفل يمين لوحة التحكم. سيبحث التطبيق عن الخلية التالية في التسلسل (Hive 1، Hive 2...). تأكد من تشغيل جهاز الاستشعار واتصاله بالـ Wi-Fi قبل الضغط." },
    // ✅ FIXED: removed 5-hive limit and device sentence
    { q: "هل يمكنني مراقبة أكثر من خلية؟", a: "نعم. يدعم Smart Bee عدداً غير محدود من الخلايا لكل حساب." },
    { q: "ماذا تعني مستويات التنبيه الثلاثة؟", a: "⚠️ تحذير — شذوذ واحد. راقب الوضع.\n🔴 عالٍ — شذوذان في نفس الوقت. افحص خلال 24 ساعة.\n🚨 حرج — 3 شذوذات أو أكثر أو دخيل مكتشف. افحص فوراً." },
    { q: "كيف أغير لغة التطبيق؟", a: "افتح القائمة الجانبية (≡) ← اللغة ← اختر الإنجليزية أو الفرنسية أو العربية. تتحدث جميع نصوص التطبيق بما فيها التنبيهات والإشعارات فوراً." },
    { q: "كيف أوقف نوعاً معيناً من الإشعارات؟", a: "افتح القائمة ← الإشعارات. يمكنك إيقاف جميع الإشعارات بالمفتاح الرئيسي، أو إيقاف أنواع بعينها: تنبيهات الخطر، الصوت، الحرارة، أو الرطوبة." },
    { q: "كيف أغير اسمي أو بريدي أو كلمة المرور؟", a: "افتح القائمة ← الحساب. اضغط 'تغيير الاسم' أو 'تغيير البريد' أو 'تغيير كلمة المرور'. ستُحفظ البيانات الجديدة وتُستخدم في تسجيل الدخول التالي." },
    { q: "ماذا يُظهر مخطط الإحصائيات؟", a: "يعرض المخطط آخر 7 أيام من بيانات الوزن (كغ) ودرجة الحرارة (°C) والرطوبة (%) للخلية المختارة. عرضا الشهر والسنة سيتوفران في تحديث قادم." },
    { q: "ماذا أفعل إذا لم يتم العثور على الخلية؟", a: "تحقق من:\n• أن جهاز الاستشعار مشغّل (مؤشر LED يضيء).\n• أنه متصل بالـ Wi-Fi (مؤشر الإشارة يضيء).\n• أن اسم الخلية في Firebase يطابق تماماً 'Hive 1'، 'Hive 2'... (حساس لحالة الأحرف)." },
    { q: "ما درجة الحرارة الطبيعية داخل الخلية؟", a: "تحافظ المستعمرة الصحية على 32–36°C في منطقة الحضنة. فوق 38°C: تحذير مبكر. فوق 40°C: إجهاد الحضنة. فوق 42°C: أضرار لا رجعة فيها — قم بتهوية الخلية فوراً." },
    { q: "ما مستوى الرطوبة الطبيعي؟", a: "الرطوبة المثالية 50–70%. فوق 80%: خطر العفن والأمراض. فوق 85%: حالة حرجة — حسّن التهوية فوراً وتحقق من وجود تسربات مياه قرب الخلية." },
    { q: "ماذا يخبرني وزن الخلية؟", a: "الوزن مؤشر قيّم جداً:\n• زيادة مستمرة ← تدفق الرحيق نشط، إنتاج جيد.\n• انخفاض مفاجئ > 1 كغ ليلاً ← ربما حدث تأرجح.\n• نقصان تدريجي شتاءً ← استهلاك طبيعي.\n• لا تغيير في الصيف ← قد لا تجمع المستعمرة الرحيق." },
    // ✅ FIXED: added unit clarification in Arabic
    { q: "ماذا يعني الصوت غير الطبيعي؟", a: "يقيس الجهاز مستوى الصوت على مقياس من 0.0 إلى 1.0 وحدة. المستوى الطبيعي: بين 0.40 و0.70 وحدة.\n• أقل من 0.40 وحدة ← المستعمرة هادئة بشكل غير طبيعي. تحقق من الملكة.\n• أعلى من 0.70 وحدة ← المستعمرة مضطربة. تأرجح محتمل خلال 12–24 ساعة. افحص خلايا الملكة." },
    // ✅ FIXED: added unit in swarming signs in Arabic
    { q: "ما هو التأرجح وكيف أمنعه؟", a: "التأرجح هو خروج الملكة القديمة مع نصف المستعمرة. العلامات: ارتفاع حاد في الصوت فوق 0.70 وحدة، انخفاض وزن > 1 كغ، تجمع النحل خارج الخلية.\n\nالوقاية:\n• أضف طابقاً قبل اكتظاظ الخلية.\n• أزل خلايا الملكة.\n• تأكد من التهوية الجيدة في الحر." },
    { q: "ماذا يعني تنبيه الدخيل؟", a: "اكتشف الجهاز اهتزازات غير عادية عند مدخل الخلية — عادةً دبور أو زنبور أو حيوان صغير.\n\nماذا تفعل:\n• افحص المدخل فوراً.\n• ابحث عن نحل ميت أو أضرار قرب المدخل.\n• فكّر في تركيب مُضيّق المدخل لحماية المستعمرة." },
    { q: "كم مرة يجب أن أفحص خليتي؟", a: "• الربيع والصيف: مرة أسبوعياً على الأقل.\n• الخريف: كل أسبوعين للتحقق من المخزون.\n• الشتاء: لا تفتح الخلية. راقبها عبر التطبيق فقط.\n\nافحص دائماً في يوم دافئ هادئ مشمس." },
    { q: "كيف أجهّز خليتي للشتاء؟", a: "• تأكد من وجود 15–20 كغ على الأقل من مخزون العسل.\n• قلّص مدخل الخلية لمنع البرد والفئران.\n• عزّل الجزء العلوي من الخلية.\n• عالج من حلم الفاروا في أواخر الصيف.\n• راقب الوزن أسبوعياً — انخفاض حاد يعني أن المستعمرة تتضور جوعاً." },
  ],
};

// ─── Quick tips ────────────────────────────────────────────────────────────────
const TIPS: Record<Lang, { icon: string; text: string }[]> = {
  English: [
    { icon: "🌡️", text: "Temperature above 38°C is an early warning. Act before it reaches 40°C." },
    { icon: "💧", text: "Humidity above 80% promotes mold. Improve ventilation immediately." },
    // ✅ FIXED: added unit
    { icon: "🔊", text: "A sound spike above 0.70 units often predicts swarming 12–24 h ahead." },
    { icon: "⚖️", text: "A weight drop over 1 kg overnight usually means swarming occurred." },
    { icon: "🔍", text: "Inspect your hive at least once a week in spring and summer." },
    { icon: "🔋", text: "Check device battery monthly. Recharge when below 20%." },
  ],
  French: [
    { icon: "🌡️", text: "Température > 38°C : signal précoce. Agissez avant 40°C." },
    { icon: "💧", text: "Humidité > 80% favorise les moisissures. Améliorez la ventilation." },
    // ✅ FIXED: added unit
    { icon: "🔊", text: "Un pic sonore > 0,70 unité prédit souvent un essaimage 12–24 h à l'avance." },
    { icon: "⚖️", text: "Une chute > 1 kg en une nuit indique souvent un essaimage." },
    { icon: "🔍", text: "Inspectez la ruche au moins une fois par semaine au printemps et en été." },
    { icon: "🔋", text: "Vérifiez la batterie mensuellement. Rechargez sous 20%." },
  ],
  Arabic: [
    { icon: "🌡️", text: "حرارة أعلى من 38°C تحذير مبكر. تصرف قبل بلوغ 40°C." },
    { icon: "💧", text: "رطوبة أعلى من 80% تسبب العفن. حسّن التهوية فوراً." },
    // ✅ FIXED: added unit
    { icon: "🔊", text: "ارتفاع الصوت فوق 0.70 وحدة غالباً ينذر بتأرجح خلال 12–24 ساعة." },
    { icon: "⚖️", text: "انخفاض وزن > 1 كغ ليلاً يعني على الأرجح حدوث تأرجح." },
    { icon: "🔍", text: "افحص خليتك مرة أسبوعياً في الربيع والصيف." },
    { icon: "🔋", text: "تحقق من بطارية الجهاز شهرياً. اشحنها عند انخفاضها عن 20%." },
  ],
};

// ─── UI strings ────────────────────────────────────────────────────────────────
const UI_TEXT: Record<Lang, {
  pageTitle: string; tips: string; diseases: string; selectHint: string;
  faq: string; contact: string; contactMsg: string;
  severity: string; sensorSignals: string; whatToDo: string; symptoms: string; close: string;
}> = {
  English: {
    pageTitle: "Help", tips: "Quick Tips", diseases: "Common Bee Diseases",
    selectHint: "Tap a disease to see details",
    faq: "Frequently Asked Questions", contact: "Still need help?", contactMsg: "Contact us at",
    severity: "Severity", sensorSignals: "Sensor signals", whatToDo: "What to do",
    symptoms: "Key signs", close: "Close",
  },
  French: {
    pageTitle: "Aide", tips: "Conseils rapides", diseases: "Maladies courantes des abeilles",
    selectHint: "Touchez une maladie pour voir les détails",
    faq: "Questions fréquentes", contact: "Besoin d'aide ?", contactMsg: "Contactez-nous à",
    severity: "Sévérité", sensorSignals: "Signaux capteurs", whatToDo: "Que faire",
    symptoms: "Signes clés", close: "Fermer",
  },
  Arabic: {
    pageTitle: "المساعدة", tips: "نصائح سريعة", diseases: "أمراض النحل الشائعة",
    selectHint: "اضغط على مرض للاطلاع على التفاصيل",
    faq: "الأسئلة الشائعة", contact: "تحتاج مساعدة؟", contactMsg: "تواصل معنا على",
    severity: "الخطورة", sensorSignals: "إشارات المستشعرات", whatToDo: "ماذا تفعل",
    symptoms: "العلامات الرئيسية", close: "إغلاق",
  },
};

// ─── Disease list row ──────────────────────────────────────────────────────────
function DiseaseRow({ d, onPress }: { d: Disease; onPress: () => void }) {
  return (
    <TouchableOpacity style={dStyles.row} onPress={onPress} activeOpacity={0.75}>
      <Text style={{ fontSize: 26 }}>{d.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={dStyles.rowName}>{d.name}</Text>
        <Text style={[dStyles.rowSev, { color: d.severityColor }]}>{d.severity}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

// ─── Disease detail bottom sheet modal ────────────────────────────────────────
function DiseaseModal({ d, ui, visible, onClose }: {
  d: Disease | null; ui: typeof UI_TEXT.English; visible: boolean; onClose: () => void;
}) {
  if (!d) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={dStyles.overlay}>
        <View style={[dStyles.sheet, { backgroundColor: d.severityBg }]}>
          {/* stripe header */}
          <View style={[dStyles.stripe, { backgroundColor: d.severityColor }]}>
            <Text style={dStyles.stripeText} numberOfLines={1}>{d.icon}  {d.name}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {/* severity pill */}
            <View style={[dStyles.sevPill, { borderColor: d.severityColor }]}>
              <Text style={[dStyles.sevPillText, { color: d.severityColor }]}>{ui.severity}: {d.severity}</Text>
            </View>

            <Text style={dStyles.desc}>{d.description}</Text>

            <View style={dStyles.block}>
              <Text style={[dStyles.blockLabel, { color: d.severityColor }]}>📡 {ui.sensorSignals}</Text>
              <Text style={dStyles.blockBody}>{d.sensorSignals}</Text>
            </View>

            <View style={dStyles.block}>
              <Text style={[dStyles.blockLabel, { color: d.severityColor }]}>✅ {ui.whatToDo}</Text>
              <Text style={dStyles.blockBody}>{d.whatToDo}</Text>
            </View>

            <View style={dStyles.block}>
              <Text style={[dStyles.blockLabel, { color: d.severityColor }]}>🔍 {ui.symptoms}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {d.symptoms.map((sym, i) => (
                  <View key={i} style={[dStyles.pill, { borderColor: d.severityColor }]}>
                    <Text style={[dStyles.pillText, { color: d.severityColor }]}>{sym}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={[dStyles.closeBtn, { backgroundColor: d.severityColor }]} onPress={onClose}>
            <Text style={dStyles.closeBtnText}>{ui.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── FAQ accordion item ────────────────────────────────────────────────────────
function AccordionItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, { toValue: open ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    setOpen(!open);
  };
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  return (
    <View style={faqS.item}>
      <TouchableOpacity style={faqS.q} onPress={toggle} activeOpacity={0.8}>
        <View style={faqS.badge}><Text style={faqS.badgeNum}>{index + 1}</Text></View>
        <Text style={faqS.qText}>{q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={20} color="#888" />
        </Animated.View>
      </TouchableOpacity>
      {open && <Text style={faqS.answer}>{a}</Text>}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function Help() {
  const { language } = useAppContext();
  const lang     = (language as Lang) || "English";
  const faqs     = FAQ_DATA[lang];
  const tips     = TIPS[lang];
  const diseases = DISEASES[lang];
  const ui       = UI_TEXT[lang];

  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [modalVisible,    setModalVisible]    = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>

      {/* ← Back header */}
      <BackHeader title={ui.pageTitle} />

      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Quick Tips ───────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>💡 {ui.tips}</Text>
        <View style={s.tipsGrid}>
          {tips.map((t, i) => (
            <View key={i} style={s.tipCard}>
              <Text style={s.tipIcon}>{t.icon}</Text>
              <Text style={s.tipText}>{t.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Bee Diseases ─────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>🐛 {ui.diseases}</Text>
        <Text style={s.hint}>{ui.selectHint}</Text>
        <View style={dStyles.listBox}>
          {diseases.map((d, i) => (
            <React.Fragment key={i}>
              <DiseaseRow d={d} onPress={() => { setSelectedDisease(d); setModalVisible(true); }} />
              {i < diseases.length - 1 && <View style={dStyles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>❓ {ui.faq}</Text>
        <View style={s.faqBox}>
          {faqs.map((item, i) => <AccordionItem key={i} index={i} q={item.q} a={item.a} />)}
        </View>

        {/* ── Contact ──────────────────────────────────────────────────── */}
        <View style={s.contactBox}>
          <Ionicons name="mail-outline" size={20} color="#FFC107" />
          <Text style={s.contactText}>
            {ui.contact}{" "}
            <Text style={{ color: "#FFC107", fontWeight: "bold" }}>smartbee@gmail.com</Text>
          </Text>
        </View>

      </ScrollView>

      <DiseaseModal
        d={selectedDisease}
        ui={ui}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:       { padding: 20, paddingBottom: 36 },
  sectionTitle: { fontSize: 17, fontWeight: "bold", marginBottom: 6, marginTop: 8 },
  hint:         { fontSize: 12.5, color: "#888", marginBottom: 10 },
  tipsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  tipCard:      {
    width: "47%",
    backgroundColor: "#FFFBEA",
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  tipIcon:      { fontSize: 26, marginBottom: 6 },
  tipText:      { fontSize: 13, color: "#444", lineHeight: 18 },
  faqBox:       { backgroundColor: "#FAFAFA", borderRadius: 20, overflow: "hidden", marginBottom: 24, elevation: 1 },
  contactBox:   { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FFF8E1", padding: 16, borderRadius: 16 },
  contactText:  { flex: 1, fontSize: 13.5, color: "#555", lineHeight: 20 },
});

const dStyles = StyleSheet.create({
  listBox:      { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#EEEEEE", marginBottom: 28, overflow: "hidden", elevation: 2 },
  row:          { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowName:      { fontSize: 14.5, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
  rowSev:       { fontSize: 12, fontWeight: "600" },
  divider:      { height: 1, backgroundColor: "#F0F0F0", marginHorizontal: 16 },
  // modal
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%", overflow: "hidden" },
  stripe:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15 },
  stripeText:   { fontSize: 16, fontWeight: "700", color: "#fff", flex: 1, marginRight: 10 },
  sevPill:      { alignSelf: "flex-start", borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14 },
  sevPillText:  { fontSize: 12.5, fontWeight: "700" },
  desc:         { fontSize: 13.5, color: "#333", lineHeight: 21, marginBottom: 4 },
  block:        { marginTop: 16 },
  blockLabel:   { fontSize: 13.5, fontWeight: "700", marginBottom: 5 },
  blockBody:    { fontSize: 13, color: "#444", lineHeight: 20 },
  pill:         { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  pillText:     { fontSize: 12, fontWeight: "600" },
  closeBtn:     { margin: 16, marginTop: 4, paddingVertical: 14, borderRadius: 25, alignItems: "center" },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

const faqS = StyleSheet.create({
  item:     { borderBottomWidth: 1, borderColor: "#EEEEEE", paddingHorizontal: 16 },
  q:        { flexDirection: "row", alignItems: "center", paddingVertical: 15, gap: 10 },
  badge:    { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFC107", justifyContent: "center", alignItems: "center" },
  badgeNum: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  qText:    { flex: 1, fontSize: 14.5, fontWeight: "600", color: "#222" },
  answer:   { fontSize: 13.5, color: "#555", lineHeight: 21, paddingBottom: 15, paddingLeft: 34 },
});