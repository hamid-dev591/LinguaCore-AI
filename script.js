// 1. الإعدادات الأساسية والأيقونات
// كود إجباري لحذف ميزة الأوفلاين من متصفح المستخدم
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log("تم حذف ميزة الأوفلاين بنجاح!");
        }
    });
}


lucide.createIcons();

const languages = {
    "en-GB": "English", "ar-SA": "Arabic", "fr-FR": "French", "es-ES": "Spanish", 
    "de-DE": "German", "it-IT": "Italian", "tr-TR": "Turkish", "ru-RU": "Russian",
    "zh-CN": "Chinese", "ja-JP": "Japanese", "ko-KR": "Korean", "hi-IN": "Hindi",
    "fa-IR": "Persian", "ur-PK": "Urdu", "bn-BD": "Bengali"
};

const fromLang = document.getElementById('fromLang'), 
      toLang = document.getElementById('toLang'), 
      inputText = document.getElementById('inputText'), 
      outputText = document.getElementById('outputText'), 
      historyList = document.getElementById('historyList');

// تعبئة قائمة اللغات[cite: 1]
Object.entries(languages).forEach(([code, name]) => {
    fromLang.add(new Option(name, code));
    toLang.add(new Option(name, code));
});

let history = JSON.parse(localStorage.getItem('linguaCore_History')) || [];
let favorites = JSON.parse(localStorage.getItem('linguaCore_Favorites')) || [];
let currentView = 'history';

// 2. وظائف الحفظ والتحديث[cite: 1]
function saveState() {
    const data = { 
        input: inputText.value, 
        output: outputText.value, 
        from: fromLang.value, 
        to: toLang.value, 
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
    };
    localStorage.setItem('linguaCore_State', JSON.stringify(data));
}

function updateDisplayUI() {
    const list = currentView === 'history' ? history : favorites;
    historyList.innerHTML = list.length ? '' : `<p class="col-span-full text-center opacity-30 py-10">No ${currentView} items found</p>`;
    
    list.slice().reverse().forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item glass-card p-5 rounded-2xl flex flex-col gap-1 fade-in cursor-pointer';
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <p class="font-bold text-sm truncate w-4/5">${item.input}</p>
                <span class="text-[9px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 font-bold uppercase">${item.lang}</span>
            </div>
            <p class="text-xs opacity-50 truncate">${item.output}</p>
        `;
        div.onclick = () => { inputText.value = item.input; outputText.value = item.output; saveState(); };
        historyList.appendChild(div);
    });
}

// 3. منطق الترجمة (API)[cite: 1]
async function translate() {
    if(!inputText.value.trim()) return;
    document.getElementById('loader').classList.remove('hidden');
    try {
        const source = fromLang.value === 'auto' ? '' : fromLang.value.split('-')[0];
        const target = toLang.value.split('-')[0];
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(inputText.value)}&langpair=${source}|${target}`);
        const data = await res.json();
        outputText.value = data.responseData.translatedText;
        
        history.push({ input: inputText.value, output: outputText.value, lang: target });
        if(history.length > 20) history.shift();
        localStorage.setItem('linguaCore_History', JSON.stringify(history));
        if(currentView === 'history') updateDisplayUI();
        saveState();
    } catch (e) { console.error("API Error"); }
    document.getElementById('loader').classList.add('hidden');
}

// 4. أزرار التحكم[cite: 1]
document.getElementById('translateBtn').onclick = translate;

document.getElementById('swapBtn').onclick = () => {
    const tempL = fromLang.value; fromLang.value = toLang.value; toLang.value = tempL;
    const tempT = inputText.value; inputText.value = outputText.value; outputText.value = tempT;
    saveState();
};

document.getElementById('starBtn').onclick = () => {
    if (!outputText.value) return;
    const item = { input: inputText.value, output: outputText.value, lang: toLang.value };
    if (!favorites.some(f => f.input === item.input)) {
        favorites.push(item);
        localStorage.setItem('linguaCore_Favorites', JSON.stringify(favorites));
        if (currentView === 'favorites') updateDisplayUI();
        alert("Added to Favorites! ⭐");
    }
};

// حذف السجل أو المفضلة[cite: 1]
document.getElementById('clearHistory').onclick = () => {
    if (confirm(`Clear all ${currentView}?`)) {
        if (currentView === 'history') {
            history = [];
            localStorage.removeItem('linguaCore_History');
        } else {
            favorites = [];
            localStorage.removeItem('linguaCore_Favorites');
        }
        updateDisplayUI();
    }
};

// التبديل بين التبويبات[cite: 1]
const sH = document.getElementById('showHistory'), sF = document.getElementById('showFavorites');
if(sH && sF) {
    sH.onclick = () => { currentView = 'history'; sH.classList.add('border-indigo-500'); sH.classList.remove('opacity-40'); sF.classList.remove('border-indigo-500'); sF.classList.add('opacity-40'); updateDisplayUI(); };
    sF.onclick = () => { currentView = 'favorites'; sF.classList.add('border-indigo-500'); sF.classList.remove('opacity-40'); sH.classList.remove('border-indigo-500'); sH.classList.add('opacity-40'); updateDisplayUI(); };
}

// 5. المايك المطور (Real-time)[cite: 1]
let isRecording = false;
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec) {
    const r = new SpeechRec();
    r.continuous = true; r.interimResults = true;
    document.getElementById('voiceBtn').onclick = () => {
        if (isRecording) { r.stop(); return; }
        r.lang = fromLang.value !== 'auto' ? fromLang.value : 'en-US';
        r.start(); isRecording = true;
        document.getElementById('voiceBtn').classList.add('active-mic');
    };
    r.onresult = (e) => {
        let transcript = "";
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        inputText.value = transcript;
        saveState();
    };
    r.onend = () => { isRecording = false; document.getElementById('voiceBtn').classList.remove('active-mic'); };
}

// 6. وظائف إضافية وتصدير[cite: 1]
document.getElementById('copyBtn').onclick = () => navigator.clipboard.writeText(outputText.value);
document.getElementById('clearBtn').onclick = () => { inputText.value = ''; outputText.value = ''; saveState(); };
document.getElementById('exportBtn').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ history, favorites }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "LinguaCore_Data.json");
    downloadAnchor.click();
};

// اختصارات لوحة المفاتيح[cite: 1]
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') translate();
    if (e.key === 'Escape') document.getElementById('clearBtn').click();
});

// تحميل الحالة عند بدء التشغيل[cite: 1]
window.onload = () => {
    const state = JSON.parse(localStorage.getItem('linguaCore_State'));
    if(state) {
        inputText.value = state.input || ""; outputText.value = state.output || ""; 
        fromLang.value = state.from || "auto"; toLang.value = state.to || "en-GB";
    }
    updateDisplayUI();
    lucide.createIcons();
};

// 1. إصلاح زر وضع النهار/الليل (Theme Toggle)
document.getElementById('themeToggle').onclick = () => {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    // تحديث الأيقونة برمجياً
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        lucide.createIcons(); // إعادة تحميل الأيقونات لتظهر التغيير
    }
    saveState();
};

// 2. إصلاح زر التبديل (Swap Button) - يقلب اللغات والنصوص
document.getElementById('swapBtn').onclick = () => {
    const tempLang = fromLang.value;
    fromLang.value = toLang.value;
    toLang.value = tempLang;

    const tempText = inputText.value;
    inputText.value = outputText.value;
    outputText.value = tempText;

    saveState();
};

// 3. إصلاح زر الإعدادات (Settings Menu)
const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');

if (settingsBtn && settingsMenu) {
    settingsBtn.onclick = (e) => {
        e.stopPropagation(); // منع إغلاق القائمة فور النقر عليها
        settingsMenu.classList.toggle('hidden');
    };

    // إغلاق القائمة عند النقر في أي مكان آخر بالشاشة
    window.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
    });

    settingsMenu.onclick = (e) => e.stopPropagation();
}

// 1. منطق زر البداية وإخفاء صفحة الترحيب
document.body.classList.add('locked'); // قفل السكرول عند التحميل

document.getElementById('startAppBtn').onclick = () => {
    const welcome = document.getElementById('welcomeScreen');
    welcome.classList.add('welcome-hide');
    document.body.classList.remove('locked'); // فتح السكرول بعد الدخول
    
    // تشغيل الأيقونات مرة أخرى للتأكد من ظهورها داخل التطبيق
    setTimeout(() => {
        welcome.style.display = 'none';
        lucide.createIcons();
    }, 1000);
};



// 3. منع القائمة الافتراضية لليمين (اختياري لزيادة الانغماس)
document.addEventListener('contextmenu', event => event.preventDefault());


// تأكيد تشغيل الأيقونات والوظائف عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    console.log("UI Elements Initialized!");
});

// دالة النطق الصوتي المحسنة
function speakText() {
    const text = document.getElementById('outputText').value;
    const lang = document.getElementById('toLang').value;

    if (!text) return;

    // إلغاء أي صوت شغال حالياً
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // جلب الأصوات المتاحة في جهازك وتنقيتها
    let voices = window.speechSynthesis.getVoices();
    
    // محاولة اختيار أفضل صوت متاح للغة المختارة
    utterance.voice = voices.find(v => v.lang.startsWith(lang)) || voices[0];
    
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.volume = 1.0; // تأكد أن الصوت بأعلى درجة

    window.speechSynthesis.speak(utterance);
    
}

// ربط الدالة بالزر (تأكد أن ID الزر هو speakBtn)
const speakBtn = document.getElementById('speakBtn');
if (speakBtn) {
    speakBtn.addEventListener('click', speakText);
}

// المحرك الأقوى والأسرع للترجمة
async function translateText(text, from, to) {
    try {
        // هذا الرابط (Endpoint) هو الأسرع حالياً ويدعم كل اللغات بدقة عالية
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // استخراج النص المترجم فقط لضمان عدم تكرار الكلمة الأصلية
        if (data && data[0]) {
            let translatedText = "";
            data[0].forEach(part => {
                if (part[0]) translatedText += part[0];
            });
            return translatedText;
        }
        return "خطأ في معالجة الترجمة";
    } catch (error) {
        console.error("API Error:", error);
        return "خطأ في الاتصال بالخادم.. تأكد من الإنترنت";
    }
}

function updateButtonStyles(mode) {
    if (mode === 'photo') {
        btnPhoto.className = 'nav-tab-btn active';
        btnText.className = 'nav-tab-btn inactive';
    } else {
        btnText.className = 'nav-tab-btn active';
        btnPhoto.className = 'nav-tab-btn inactive';
    }
}
// قائمة اللغات التي تكتب من اليمين لليسار (RTL)
const rtlLanguages = ['ar', 'ur', 'fa'];

// داخل دالة التبديل أو المعالجة
const translatedDiv = document.getElementById('translatedText');
translatedDiv.dir = rtlLanguages.includes(selectedLang) ? 'rtl' : 'ltr';