// ================= القواعد المنطقية (مخصصة لموّثق) =================
const validCodes = ["A10203", "B55443", "QR9988"]; 
const fearWords = ["ايقاف","إيقاف","حظر","عاجل","آخر مهلة","فورا"];
const sensitiveDataWords = ["رقم الهوية","رقم الحساب","الرقم السري","رمز التحقق","cvv","كلمة المرور"];
const officialDomains = ["alinma.com", "alinma.sa"]; 
const suspiciousShorteners = ["bit.ly","tinyurl","t.co","goo.gl","cutt.ly"];

// ================= index.html =================
const verifyBtn = document.getElementById('verifyBtn');
const mainInput = document.getElementById('mainInput');
const micBtn = document.getElementById('micBtn');

if (verifyBtn && mainInput) {
    verifyBtn.addEventListener('click', () => {
        const text = mainInput.value.trim();
        if (!text) {
            alert('الرجاء إدخال الرمز، النص، أو الرابط أولاً.');
            return;
        }
        sessionStorage.setItem('msgToAnalyze', text);
        window.location.href = 'verify.html';
    });

    let recognition;
    let isListening = false;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRec();
        recognition.lang = 'ar-SA';
        
        recognition.onresult = (e) => {
            mainInput.value = e.results[0][0].transcript;
        };
        
        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
        };
    }

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (!recognition) {
                alert("متصفحك لا يدعم الإدخال الصوتي.");
                return;
            }
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
                isListening = true;
                micBtn.classList.add('listening');
                mainInput.placeholder = "تحدث الآن، أنا أستمع...";
            }
        });
    }
}

// ================= verify.html =================
window.addEventListener('DOMContentLoaded', () => {
    const resultContainer = document.getElementById('resultContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (resultContainer && emptyState) {
        const storedText = sessionStorage.getItem('msgToAnalyze');
        
        if (!storedText) {
            resultContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        resultContainer.style.display = 'block';
        document.getElementById('originalTextDisplay').textContent = storedText;
        
        let result = {};
        
        // 1. التحقق الاستباقي من الرموز الموثقة
        if (validCodes.includes(storedText.toUpperCase())) {
            result = {
                score: 0, 
                title: "لا يوجد خطر - رسالة موثوقة",
                desc: "تم التحقق من الرمز في قاعدة البيانات بنجاح.",
                reasons: ["✅ الرمز مطابق للسجلات الرسمية.", "✅ المعاملة آمنة تماماً ولا تشكل خطراً."]
            };
        } 
        // 2. التحليل الذكي للنصوص والروابط
        else {
            result = analyzeTextData(storedText);
        }

        renderResult(result);
    }
});

function analyzeTextData(text) {
    let score = 0; 
    let reasons = [];
    const lower = text.toLowerCase();

    const sensitive = sensitiveDataWords.filter(w => lower.includes(w));
    if (sensitive.length > 0) {
        score += 60;
        reasons.push("⚠️ الرسالة تطلب بيانات حساسة: " + sensitive.join("، "));
    }

    const fear = fearWords.filter(w => lower.includes(w));
    if (fear.length > 0) {
        score += 30;
        reasons.push("⚠️ استخدام أسلوب تخويف واستعجال.");
    }

    const links = text.match(/(https?:\/\/[^\s]+)/g) || [];
    if (links.length > 0) {
        links.forEach(link => {
            const isOfficial = officialDomains.some(d => link.includes(d));
            const isShort = suspiciousShorteners.some(d => link.includes(d));
            
            if (isOfficial) {
                reasons.push("✅ الرابط يتبع النطاق الرسمي.");
            } else if (isShort) {
                score += 50;
                reasons.push("⛔ استخدام رابط مختصر لإخفاء الوجهة الحقيقية.");
            } else {
                score += 60;
                reasons.push("⛔ الرابط المرفق لا يتبع الجهات الرسمية.");
            }
        });
    } else if (score === 0 && !validCodes.includes(text)) {
         score = 25; 
         reasons.push("ℹ️ رسالة غير مسجلة كرمز رسمي، يرجى الحذر إذا كانت تطلب إجراءً مشبوهاً.");
    }

    if (score > 100) score = 100;

    if (score >= 80) {
        return { score: score, title: "خطر شديد", desc: "هذه الرسالة احتيالية بنسبة كبيرة.", reasons };
    } else if (score >= 40) {
        return { score: score, title: "خطر متوسط", desc: "تتضمن الرسالة مؤشرات مشبوهة، تجنب الضغط على الروابط.", reasons };
    } else {
        if(reasons.length === 0) reasons.push("✅ لم يتم رصد أي مؤشرات تقنية للاحتيال في النص.");
        return { score: score, title: "لا يوجد خطر ملحوظ", desc: "النص يبدو آمناً مبدئياً.", reasons };
    }
}

function renderResult(data) {
    const gaugeFg = document.getElementById('gaugeFg');
    const gaugeText = document.getElementById('gaugeText');
    const resultTitle = document.getElementById('resultTitle');
    const resultDesc = document.getElementById('resultDesc');
    const reasonsList = document.getElementById('reasonsList');
    
    // تعبئة الأسباب
    reasonsList.innerHTML = '';
    data.reasons.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        reasonsList.appendChild(li);
    });

    resultTitle.textContent = data.title;
    resultDesc.textContent = data.desc;

    // حساب العداد (محيط الدائرة = 377)
    const CIRC = 377;
    gaugeFg.style.strokeDashoffset = CIRC; // تبدأ فارغة
    
    setTimeout(() => {
        const offset = CIRC - (CIRC * data.score / 100);
        gaugeFg.style.strokeDashoffset = offset;
    }, 50);

    // عداد الأرقام
    gaugeText.textContent = data.score + "%";

    // الألوان 3 درجات (أخضر، أصفر، أحمر) بناءً على النسبة
    if (data.score >= 80) {
        gaugeFg.style.stroke = 'var(--danger-color)'; // أحمر
        resultTitle.style.color = 'var(--danger-color)';
    } else if (data.score >= 40) {
        gaugeFg.style.stroke = 'var(--warning-color)'; // أصفر
        resultTitle.style.color = 'var(--warning-color)';
    } else {
        gaugeFg.style.stroke = 'var(--safe-color)'; // أخضر
        resultTitle.style.color = 'var(--safe-color)';
    }

    window.lastResultSpeech = `${data.title}. نسبة الخطورة ${data.score} بالمائة. الأسباب: ${data.reasons.join(". ")}`;
}

// ================= القراءة الصوتية =================
const speakResultBtn = document.getElementById('speakResultBtn');
if (speakResultBtn) {
    speakResultBtn.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(window.lastResultSpeech || "لا توجد نتيجة لقراءتها.");
            utter.lang = "ar-SA";
            window.speechSynthesis.speak(utter);
        } else {
            alert("المتصفح لا يدعم خاصية القراءة الصوتية.");
        }
    });
}