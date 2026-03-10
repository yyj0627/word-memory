// ==================== 全局变量 ====================
let currentWords = [];
let currentStory = '';
let currentChineseStory = '';
let currentDefinitions = {};
let etymologyCache = {}; // 词根词缀缓存
let lookupCache = {}; // 划词翻译缓存
let currentLookupWord = ''; // 当前查询的单词
const HISTORY_KEY = 'wordMemoryHistory';
const SETTINGS_KEY = 'wordMemorySettings';
const WRONG_WORDS_KEY = 'wordMemoryWrongWords';
const ETYMOLOGY_KEY = 'wordMemoryEtymology'; // 词根词缀持久化存储
const LOOKUP_KEY = 'wordMemoryLookup'; // 划词翻译持久化存储
const MAX_HISTORY = 50;

// API配置
const API_CONFIGS = {
    siliconflow: {
        url: 'https://api.siliconflow.cn/v1/chat/completions',
        defaultModel: 'Qwen/Qwen2.5-7B-Instruct'
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-4o-mini'
    },
    deepseek: {
        url: 'https://api.deepseek.com/chat/completions',
        defaultModel: 'deepseek-chat'
    }
};

// 清理故事中的中文字符，保留英文、标点和**标记
function cleanChineseFromStory(text) {
    // 按行处理
    const lines = text.split('\n');
    const cleanedLines = lines.map(line => {
        // 跳过标记行
        if (/^\[?(STORY|DEFINITIONS|CHINESE|释义|词汇|翻译)/i.test(line.trim())) {
            return '';
        }
        // 跳过看起来像释义列表的行（word: 释义 格式）
        if (/^[\-\*\d\.]*\s*[a-zA-Z]+\s*[:：]\s*[\u4e00-\u9fa5]/.test(line.trim())) {
            return '';
        }
        // 如果整行都是中文（可能是翻译或说明），跳过
        const chineseRatio = (line.match(/[\u4e00-\u9fa5]/g) || []).length / (line.length || 1);
        if (chineseRatio > 0.3) {
            return '';
        }
        // 移除行内的中文字符和中文标点
        let cleaned = line.replace(/[\u4e00-\u9fa5，。！？、；：""''（）【】]/g, '');
        // 移除空括号
        cleaned = cleaned.replace(/\(\s*\)/g, '');
        // 移除残留的 [word: word: ...] 格式
        cleaned = cleaned.replace(/\[[\w\s:,]+\]/g, '');
        // 移除清理后只剩 word: word: 这种残留的内容
        if (/^[\s\w:,\-\*\.]+$/.test(cleaned) && (cleaned.match(/:/g) || []).length > 2) {
            return '';
        }
        return cleaned;
    }).filter(line => line.trim());
    
    return cleanedLines.join('\n');
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initUploadArea();
    initWordInput();
    initSettings();
    loadHistory();
    loadEtymologyCache();
    loadLookupCache();
    initLookupFeature();
});

// ==================== 图片上传与OCR ====================
function initUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');

    // 点击上传
    uploadArea.addEventListener('click', () => imageInput.click());

    // 拖拽效果
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    // 拖拽上传
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            processImages(files);
        }
    });

    // 文件选择
    imageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            processImages(files);
        }
    });
}

async function processImages(files) {
    const ocrProgress = document.getElementById('ocrProgress');
    const progressFill = document.getElementById('progressFill');
    const ocrStatus = document.getElementById('ocrStatus');
    const wordInput = document.getElementById('wordInput');

    ocrProgress.style.display = 'block';
    progressFill.style.width = '0%';
    ocrStatus.textContent = `正在处理 0/${files.length} 张图片...`;

    const allWords = new Set();
    
    // 获取已有的单词
    const existingWords = parseWords(wordInput.value);
    existingWords.forEach(w => allWords.add(w.toLowerCase()));

    for (let i = 0; i < files.length; i++) {
        ocrStatus.textContent = `正在识别第 ${i + 1}/${files.length} 张图片...`;
        
        try {
            const result = await Tesseract.recognize(files[i], 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = ((i + m.progress) / files.length) * 100;
                        progressFill.style.width = `${progress}%`;
                    }
                }
            });

            // 提取英文单词
            const text = result.data.text;
            const words = extractEnglishWords(text);
            words.forEach(w => allWords.add(w.toLowerCase()));
        } catch (error) {
            console.error('OCR错误:', error);
        }
    }

    // 更新输入框
    const uniqueWords = Array.from(allWords).sort();
    wordInput.value = uniqueWords.join('\n');
    updateWordCount();

    progressFill.style.width = '100%';
    ocrStatus.textContent = `识别完成！共提取 ${uniqueWords.length} 个单词`;

    setTimeout(() => {
        ocrProgress.style.display = 'none';
    }, 2000);
}

function extractEnglishWords(text) {
    // 匹配英文单词（至少2个字母）
    const matches = text.match(/[a-zA-Z]{2,}/g) || [];
    // 过滤常见的非单词
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out']);
    return matches.filter(w => w.length >= 3 && !stopWords.has(w.toLowerCase()));
}

// ==================== 单词输入处理 ====================
function initWordInput() {
    const wordInput = document.getElementById('wordInput');
    wordInput.addEventListener('input', updateWordCount);
}

function updateWordCount() {
    const words = parseWords(document.getElementById('wordInput').value);
    document.getElementById('wordCount').textContent = words.length;
}

function parseWords(text) {
    // 支持换行、空格、逗号分隔
    const words = text
        .split(/[\n,\s]+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length >= 2 && /^[a-zA-Z]+$/.test(w));
    
    // 去重
    return [...new Set(words)];
}

// ==================== 故事生成 ====================
async function generateStory() {
    const wordInput = document.getElementById('wordInput');
    const words = parseWords(wordInput.value);

    if (words.length === 0) {
        alert('请先输入一些单词！');
        return;
    }

    // 检查API设置
    const settings = getSettings();
    if (!settings.apiKey) {
        alert('请先在设置中配置API Key！');
        toggleSettings();
        return;
    }

    currentWords = words;
    
    // 显示加载动画
    showLoading();
    
    try {
        const result = await callAI(words, settings);
        
        // 解析AI返回的结果
        parseAIResponse(result);
        
        // 检查缺失的释义，自动补充
        // 1. 从用户输入的单词检查
        let missingWords = currentWords.filter(w => !currentDefinitions[w.toLowerCase()]);
        
        // 2. 从故事中提取的**word**也检查（可能和用户输入不完全一致）
        const storyWords = [];
        currentStory.replace(/\*\*([a-zA-Z]+)\*\*/g, (match, word) => {
            storyWords.push(word.toLowerCase());
            return match;
        });
        storyWords.forEach(w => {
            if (!currentDefinitions[w] && !missingWords.includes(w)) {
                missingWords.push(w);
            }
        });
        
        if (missingWords.length > 0) {
            console.log('缺失释义的单词:', missingWords);
            document.getElementById('loadingHint').textContent = '补充缺失的释义...';
            try {
                await fetchMissingDefinitions(missingWords, settings);
            } catch (e) {
                console.error('补充释义失败:', e);
            }
        }
        
        hideLoading();
        
        // 渲染故事
        renderStory();
        
        // 保存历史
        saveToHistory();
        
        // 显示故事区域
        document.getElementById('storySection').style.display = 'block';
        document.getElementById('storySection').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        hideLoading();
        console.error('API调用失败:', error);
        alert('故事生成失败：' + error.message);
    }
}

// 补充缺失的释义
async function fetchMissingDefinitions(missingWords, settings) {
    const provider = settings.provider || 'openai';
    let apiUrl, model;
    
    if (provider === 'custom') {
        apiUrl = settings.customUrl;
        model = settings.model || 'gpt-3.5-turbo';
    } else {
        apiUrl = API_CONFIGS[provider].url;
        model = settings.model || API_CONFIGS[provider].defaultModel;
    }
    
    // 分批处理，每次最多20个单词
    const batchSize = 20;
    for (let i = 0; i < missingWords.length; i += batchSize) {
        const batch = missingWords.slice(i, i + batchSize);
        
        const prompt = `请为以下${batch.length}个英文单词提供简短的中文释义。

单词列表：
${batch.map((w, idx) => `${idx + 1}. ${w}`).join('\n')}

请严格按以下格式输出，确保每个单词都有释义：
1. ${batch[0]}: 中文释义
2. ...

现在开始输出所有${batch.length}个单词的释义：`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.2
                })
            });

            if (!response.ok) continue;

            const data = await response.json();
            const content = data.choices[0].message.content;
            console.log('补充释义响应:', content);
            
            // 解析释义
            const lines = content.split('\n').filter(l => l.trim());
            
            // 方法1：按行解析，尝试匹配batch中的单词
            lines.forEach((line, lineIdx) => {
                // 提取行中的中文释义部分
                const defMatch = line.match(/[:：\-–—]+\s*(.+)/);
                if (!defMatch) return;
                
                const def = defMatch[1].trim();
                if (!/[\u4e00-\u9fa5]/.test(def)) return; // 确保是中文
                
                // 尝试找到这一行对应的单词
                let targetWord = null;
                
                // 先尝试精确匹配：行中包含batch里的某个单词
                for (const batchWord of batch) {
                    const wordLower = batchWord.toLowerCase();
                    const lineWords = line.toLowerCase().match(/[a-z]+/g) || [];
                    if (lineWords.includes(wordLower)) {
                        targetWord = wordLower;
                        break;
                    }
                }
                
                // 如果没找到，按行号对应
                if (!targetWord && lineIdx < batch.length) {
                    targetWord = batch[lineIdx].toLowerCase();
                }
                
                if (targetWord && !currentDefinitions[targetWord]) {
                    currentDefinitions[targetWord] = def;
                    console.log('补充释义成功:', targetWord, '->', def);
                }
            });
            
            // 方法2：按顺序提取所有中文释义，对应到batch
            const allDefs = lines
                .map(l => l.match(/[:：\-–—]+\s*(.+)/))
                .filter(m => m && /[\u4e00-\u9fa5]/.test(m[1]))
                .map(m => m[1].trim());
            
            batch.forEach((word, idx) => {
                const wordLower = word.toLowerCase();
                if (!currentDefinitions[wordLower] && allDefs[idx]) {
                    currentDefinitions[wordLower] = allDefs[idx];
                    console.log('按顺序补充:', wordLower, '->', allDefs[idx]);
                }
            });
        } catch (e) {
            console.error('补充释义批次失败:', e);
        }
    }
    
    // 最后检查：对仍然缺失的单词，标记为"暂无释义"
    missingWords.forEach(word => {
        if (!currentDefinitions[word.toLowerCase()]) {
            currentDefinitions[word.toLowerCase()] = '暂无释义';
        }
    });
}

function showLoading() {
    document.getElementById('loadingModal').classList.add('show');
    // 动态更新提示
    const hints = ['正在构思情节...', '编织故事中...', '添加单词释义...', '润色语句...'];
    let i = 0;
    window.loadingInterval = setInterval(() => {
        document.getElementById('loadingHint').textContent = hints[i % hints.length];
        i++;
    }, 2000);
}

function hideLoading() {
    document.getElementById('loadingModal').classList.remove('show');
    if (window.loadingInterval) {
        clearInterval(window.loadingInterval);
    }
}

async function callAI(words, settings) {
    const provider = settings.provider || 'openai';
    let apiUrl, model;
    
    if (provider === 'custom') {
        apiUrl = settings.customUrl;
        model = settings.model || 'gpt-3.5-turbo';
    } else {
        apiUrl = API_CONFIGS[provider].url;
        model = settings.model || API_CONFIGS[provider].defaultModel;
    }
    
    const prompt = `你是一位雅思阅读材料的专业撰写者。请根据以下单词列表，判断它们的主题，然后撰写一篇符合雅思阅读风格的学术短文。

单词列表：${words.join(', ')}

写作要求：
1. 先分析这些单词的共同主题（如环境、科技、教育、健康、社会等）
2. 围绕该主题撰写一篇200-350词的学术性短文
3. 文章结构清晰：引言提出话题 → 主体段落展开论述 → 结论总结观点
4. 语言风格要正式、客观，符合雅思阅读的学术风格
5. 可以引用数据、研究或专家观点来增强说服力
6. 所有单词必须自然融入文章，用 **word** 格式标记
7. 单词要分散在文章各处，体现词汇在真实语境中的用法

格式要求：
[STORY]
(纯英文学术短文，单词用**word**标记，禁止出现任何中文)

[DEFINITIONS]
word1: 中文释义（包含词性）
word2: 中文释义（包含词性）
（必须包含全部 ${words.length} 个单词，每行一个）

[CHINESE]
文章的完整中文翻译`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.8
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function parseAIResponse(response) {
    console.log('AI原始响应:', response); // 调试用
    
    // 提取故事部分
    const storyMatch = response.match(/\[STORY\]|【STORY】|【故事】|\[故事\]/i);
    if (storyMatch) {
        const storyStart = response.indexOf(storyMatch[0]) + storyMatch[0].length;
        const defMatch = response.match(/\[DEFINITIONS\]|【DEFINITIONS】|【释义】|\[释义\]|【词汇释义】/i);
        const storyEnd = defMatch ? response.indexOf(defMatch[0]) : response.length;
        let story = response.substring(storyStart, storyEnd).trim();
        
        // 清理故事中的中文字符（保留英文、标点、**标记）
        story = cleanChineseFromStory(story);
        currentStory = story;
    } else {
        // 如果没有标记，尝试智能分割
        const lines = response.split('\n');
        const defStart = lines.findIndex(l => /^[a-zA-Z]+:/.test(l.trim()));
        if (defStart > 0) {
            let story = lines.slice(0, defStart).join('\n').trim();
            story = cleanChineseFromStory(story);
            currentStory = story;
        } else {
            currentStory = cleanChineseFromStory(response);
        }
    }
    
    // 提取释义部分
    currentDefinitions = {};
    const defStartMatch = response.match(/\[DEFINITIONS\]|【DEFINITIONS】|【释义】|\[释义\]|【词汇释义】/i);
    const chineseStartMatch = response.match(/\[CHINESE\]|【CHINESE】|【中文翻译】|\[中文翻译\]|【中文版】|\[中文版\]|【全文翻译】/i);
    
    if (defStartMatch) {
        const defStart = response.indexOf(defStartMatch[0]) + defStartMatch[0].length;
        const defEnd = chineseStartMatch ? response.indexOf(chineseStartMatch[0]) : response.length;
        const defSection = response.substring(defStart, defEnd).trim();
        
        const defLines = defSection.split('\n');
        defLines.forEach(line => {
            // 匹配多种格式: "word: 释义", "word - 释义", "**word**: 释义", "1. word: 释义"
            const match = line.match(/^[\-\*\d\.\s]*\*{0,2}([a-zA-Z]+)\*{0,2}[\s]*[:：\-–—]+\s*(.+)$/);
            if (match && match[2].trim()) {
                currentDefinitions[match[1].toLowerCase()] = match[2].trim();
            }
        });
    } else {
        // 尝试从文本中提取定义格式的行
        const lines = response.split('\n');
        lines.forEach(line => {
            const match = line.trim().match(/^[\-\*\d\.\s]*\*{0,2}([a-zA-Z]+)\*{0,2}[\s]*[:：\-–—]+\s*(.+)$/);
            if (match && match[2].trim() && currentWords.includes(match[1].toLowerCase())) {
                currentDefinitions[match[1].toLowerCase()] = match[2].trim();
            }
        });
    }
    
    // 提取中文翻译部分
    if (chineseStartMatch) {
        const chineseStart = response.indexOf(chineseStartMatch[0]) + chineseStartMatch[0].length;
        currentChineseStory = response.substring(chineseStart).trim();
    } else {
        currentChineseStory = '';
    }
    
    console.log('解析结果 - 故事:', currentStory.substring(0, 100) + '...');
    console.log('解析结果 - 释义:', currentDefinitions);
    console.log('解析结果 - 中文:', currentChineseStory.substring(0, 100) + '...');
}

// ==================== 设置管理 ====================
function initSettings() {
    const settings = getSettings();
    document.getElementById('apiProvider').value = settings.provider || 'siliconflow';
    document.getElementById('apiKey').value = settings.apiKey || '';
    document.getElementById('customApiUrl').value = settings.customUrl || '';
    document.getElementById('modelName').value = settings.model || '';
    
    // 监听provider变化
    document.getElementById('apiProvider').addEventListener('change', (e) => {
        document.getElementById('customUrlGroup').style.display = 
            e.target.value === 'custom' ? 'block' : 'none';
    });
    
    // 初始化显示状态
    if (settings.provider === 'custom') {
        document.getElementById('customUrlGroup').style.display = 'block';
    }
}

function getSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch {
        return {};
    }
}

function saveSettings() {
    const settings = {
        provider: document.getElementById('apiProvider').value,
        apiKey: document.getElementById('apiKey').value.trim(),
        customUrl: document.getElementById('customApiUrl').value.trim(),
        model: document.getElementById('modelName').value.trim()
    };
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    toggleSettings();
    alert('设置已保存！');
}

function toggleSettings() {
    document.getElementById('settingsModal').classList.toggle('show');
}

function showModal(words) {
    // 保留旧函数以兼容，但现在直接调用AI
    generateStory();
}

function closeModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

// ==================== 故事渲染 ====================
function renderStory() {
    renderAnnotatedStory();
    renderPlainStory();
    renderChineseStory();
    renderQuizStory();
    
    // 后台预加载词根词缀
    preloadEtymology();
}

// 创建带语音的单词元素
function createWordWithTooltip(word, showDefinitionInline = false) {
    const lowerWord = word.toLowerCase();
    const definition = currentDefinitions[lowerWord] || '暂无释义';
    
    let html = `<span class="highlight" data-word="${lowerWord}" onclick="speakWord('${word}', event)">`;
    html += word;
    html += `</span>`;
    
    if (showDefinitionInline) {
        const isPlaceholder = definition === '暂无释义';
        const cls = isPlaceholder ? 'definition definition-missing' : 'definition';
        html += ` <span class="${cls}">(${definition})</span>`;
    }
    
    return html;
}

// 语音播放功能（点击触发）- 使用有道词典真人发音
function speakWord(word, event) {
    // 使用有道词典的真人发音（美式）
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
    
    // 停止之前的音频
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
    }
    
    const audio = new Audio(audioUrl);
    window.currentAudio = audio;
    
    audio.play().catch(err => {
        console.log('有道发音失败，使用备用方案:', err);
        // 备用：浏览器内置语音
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.85;
            window.speechSynthesis.speak(utterance);
        }
    });
    
    // 显示词根词缀弹出标签
    showEtymologyPopup(word, event);
}

// ==================== 词根词缀功能 ====================
function loadEtymologyCache() {
    const stored = localStorage.getItem(ETYMOLOGY_KEY);
    if (stored) {
        try {
            etymologyCache = JSON.parse(stored);
        } catch (e) {
            etymologyCache = {};
        }
    }
}

function saveEtymologyCache() {
    localStorage.setItem(ETYMOLOGY_KEY, JSON.stringify(etymologyCache));
}

// 预加载所有当前单词的词根词缀
async function preloadEtymology() {
    const settings = loadSettings();
    if (!settings.apiKey || currentWords.length === 0) return;
    
    // 找出未缓存的单词
    const uncachedWords = currentWords.filter(w => !etymologyCache[w.toLowerCase()]);
    if (uncachedWords.length === 0) return;
    
    console.log('后台预加载词根词缀:', uncachedWords);
    
    // 批量请求词根词缀（一次请求多个单词）
    await fetchEtymologyBatch(uncachedWords);
}

// 批量获取词根词缀
async function fetchEtymologyBatch(words) {
    const settings = loadSettings();
    if (!settings.apiKey || words.length === 0) return;
    
    const provider = settings.provider || 'openai';
    let apiUrl, model;
    
    if (provider === 'custom') {
        apiUrl = settings.customUrl;
        model = settings.model || 'gpt-3.5-turbo';
    } else {
        apiUrl = API_CONFIGS[provider].url;
        model = settings.model || API_CONFIGS[provider].defaultModel;
    }
    
    const wordList = words.slice(0, 10).join(', '); // 最多10个词
    
    const prompt = `分析以下英文单词的词根词缀：${wordList}

返回JSON数组（不要markdown代码块）：
[{"word":"单词","parts":[{"part":"词根/词缀","meaning":"含义","type":"root/prefix/suffix"}],"origin":"词源","analysis":"说明"}]

要求简洁，每个单词的analysis不超过15字。`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) return;

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // 解析JSON数组
        let etymologies;
        try {
            etymologies = JSON.parse(content);
        } catch (e) {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                etymologies = JSON.parse(jsonMatch[0]);
            } else {
                return;
            }
        }
        
        // 缓存所有结果
        if (Array.isArray(etymologies)) {
            etymologies.forEach(ety => {
                if (ety.word) {
                    etymologyCache[ety.word.toLowerCase()] = ety;
                }
            });
            saveEtymologyCache();
            console.log('词根词缀预加载完成');
        }
    } catch (err) {
        console.log('批量获取词根词缀失败:', err.message);
    }
}

function showEtymologyPopup(word, event) {
    const popup = document.getElementById('etymologyPopup');
    const wordEl = document.getElementById('etymologyWord');
    const contentEl = document.getElementById('etymologyContent');
    
    wordEl.textContent = word;
    
    // 获取点击位置
    let x, y;
    if (event) {
        x = event.clientX || event.pageX;
        y = event.clientY || event.pageY;
    } else {
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
    }
    
    // 检查缓存
    const lowerWord = word.toLowerCase();
    if (etymologyCache[lowerWord]) {
        contentEl.innerHTML = formatEtymology(etymologyCache[lowerWord]);
    } else {
        contentEl.innerHTML = '<div class="etymology-loading">分析词根词缀中...</div>';
        fetchEtymology(word);
    }
    
    // 显示弹出框
    popup.classList.add('show');
    
    // 计算位置，确保不超出屏幕
    const popupRect = popup.getBoundingClientRect();
    const padding = 10;
    
    // 优先显示在点击位置右下方
    let left = x + 10;
    let top = y + 10;
    
    // 如果超出右边界，显示在左边
    if (left + popupRect.width > window.innerWidth - padding) {
        left = x - popupRect.width - 10;
    }
    
    // 如果超出下边界，显示在上方
    if (top + popupRect.height > window.innerHeight - padding) {
        top = y - popupRect.height - 10;
    }
    
    // 确保不超出左边界和上边界
    left = Math.max(padding, left);
    top = Math.max(padding, top);
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

function hideEtymologyPopup() {
    const popup = document.getElementById('etymologyPopup');
    popup.classList.remove('show');
}

// 点击其他地方关闭弹出框
document.addEventListener('click', (e) => {
    const popup = document.getElementById('etymologyPopup');
    if (popup && !popup.contains(e.target) && !e.target.classList.contains('highlight')) {
        hideEtymologyPopup();
    }
});

async function fetchEtymology(word) {
    const settings = loadSettings();
    
    if (!settings.apiKey) {
        const contentEl = document.getElementById('etymologyContent');
        contentEl.innerHTML = '<div class="etymology-section"><span class="etymology-meaning">请先在设置中配置API</span></div>';
        return;
    }
    
    const provider = settings.provider || 'openai';
    let apiUrl, model;
    
    if (provider === 'custom') {
        apiUrl = settings.customUrl;
        model = settings.model || 'gpt-3.5-turbo';
    } else {
        apiUrl = API_CONFIGS[provider].url;
        model = settings.model || API_CONFIGS[provider].defaultModel;
    }
    
    // 简化的 prompt
    const prompt = `单词"${word}"的词根词缀分析，返回JSON（无代码块）：
{"word":"${word}","parts":[{"part":"词根/词缀","meaning":"含义","type":"root/prefix/suffix"}],"origin":"词源","analysis":"简短说明"}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // 解析JSON
        let etymology;
        try {
            // 尝试直接解析
            etymology = JSON.parse(content);
        } catch (e) {
            // 尝试从文本中提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                etymology = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('无法解析返回内容');
            }
        }
        
        // 缓存结果
        const lowerWord = word.toLowerCase();
        etymologyCache[lowerWord] = etymology;
        saveEtymologyCache();
        
        // 更新显示
        const contentEl = document.getElementById('etymologyContent');
        const currentWord = document.getElementById('etymologyWord').textContent;
        if (currentWord.toLowerCase() === lowerWord) {
            contentEl.innerHTML = formatEtymology(etymology);
        }
    } catch (err) {
        console.error('获取词根词缀失败:', err);
        const contentEl = document.getElementById('etymologyContent');
        if (err.name === 'AbortError') {
            contentEl.innerHTML = '<div class="etymology-section"><span class="etymology-meaning">请求超时，请重试</span></div>';
        } else {
            contentEl.innerHTML = '<div class="etymology-section"><span class="etymology-meaning">获取失败，请重试</span></div>';
        }
    }
}

function formatEtymology(etymology) {
    let html = '';
    
    // 词源
    if (etymology.origin) {
        html += `<div class="etymology-section">
            <div class="etymology-label">词源</div>
            <div class="etymology-value">${etymology.origin}</div>
        </div>`;
    }
    
    // 词根词缀拆解
    if (etymology.parts && etymology.parts.length > 0) {
        html += `<div class="etymology-section">
            <div class="etymology-label">构词分析</div>
            <div class="etymology-value">`;
        
        etymology.parts.forEach(part => {
            const typeLabel = part.type === 'prefix' ? '前缀' : 
                             part.type === 'suffix' ? '后缀' : '词根';
            html += `<span class="etymology-root">${part.part}</span>
                     <span class="etymology-meaning">(${typeLabel}: ${part.meaning})</span><br>`;
        });
        
        html += `</div></div>`;
    }
    
    // 分析说明
    if (etymology.analysis) {
        html += `<div class="etymology-section">
            <div class="etymology-label">说明</div>
            <div class="etymology-value">${etymology.analysis}</div>
        </div>`;
    }
    
    return html || '<div class="etymology-section"><span class="etymology-meaning">暂无词根词缀信息</span></div>';
}

function renderAnnotatedStory() {
    const container = document.getElementById('annotatedStory');
    let html = currentStory;

    // 替换**word**为带释义的格式（带tooltip和语音）
    html = html.replace(/\*\*([a-zA-Z]+)\*\*/g, (match, word) => {
        return createWordWithTooltip(word, true);
    });

    container.innerHTML = html;
}

function renderPlainStory() {
    const container = document.getElementById('plainStory');
    let html = currentStory;

    // 替换**word**为加粗格式（带tooltip和语音）
    html = html.replace(/\*\*([a-zA-Z]+)\*\*/g, (match, word) => {
        return createWordWithTooltip(word, false);
    });

    container.innerHTML = html;
}

function renderChineseStory() {
    const container = document.getElementById('chineseStory');
    if (currentChineseStory && currentChineseStory.length > 0) {
        // 将换行转换为段落
        let html = currentChineseStory
            .split(/\n\n+/)
            .filter(p => p.trim())
            .map(p => `<p>${p.trim()}</p>`)
            .join('');
        
        // 如果没有多段落，就用单段落
        if (!html) {
            html = `<p>${currentChineseStory}</p>`;
        }
        
        // 将 **内容** 转换为加粗
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p style="color: #888; text-align: center;">中文翻译暂无内容，请重新生成故事</p>';
    }
}

function renderQuizStory() {
    const container = document.getElementById('quizStory');
    let html = currentStory;
    let inputIndex = 0;

    // 替换**word**为填空输入框
    html = html.replace(/\*\*([a-zA-Z]+)\*\*/g, (match, word) => {
        const lowerWord = word.toLowerCase();
        inputIndex++;
        let result = `<span class="highlight" data-word="${lowerWord}" onclick="speakWord('${word}', event)">`;
        result += word;
        result += `</span>`;
        result += ` <input type="text" class="quiz-input" data-word="${lowerWord}" data-index="${inputIndex}" placeholder="中文释义">`;
        return result;
    });

    container.innerHTML = html;
    
    // 重置结果区域
    document.getElementById('quizResult').style.display = 'none';
}

// ==================== Tab切换 ====================
function switchTab(tabName) {
    // 更新Tab按钮状态
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // 更新Tab内容
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}Pane`).classList.add('active');
}

// ==================== 填空检测 ====================
function submitQuiz() {
    const inputs = document.querySelectorAll('.quiz-input');
    let correct = 0;
    let total = 0;
    const wrongWords = []; // 收集错误的单词

    inputs.forEach(input => {
        const word = input.dataset.word;
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = currentDefinitions[word] || '';

        total++;

        // 简单的相似度检测
        if (correctAnswer) {
            const similarity = calculateSimilarity(userAnswer, correctAnswer.toLowerCase());
            if (similarity >= 0.6) {
                input.classList.add('correct');
                input.classList.remove('incorrect');
                correct++;
            } else {
                input.classList.add('incorrect');
                input.classList.remove('correct');
                // 显示正确答案
                if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('correct-answer')) {
                    const span = document.createElement('span');
                    span.className = 'correct-answer';
                    span.textContent = `✓ ${correctAnswer}`;
                    input.insertAdjacentElement('afterend', span);
                }
                // 记录错误的单词
                wrongWords.push({
                    word: word,
                    definition: correctAnswer
                });
            }
        }
    });

    // 将错误的单词添加到错词本
    if (wrongWords.length > 0) {
        addToWrongWords(wrongWords);
    }

    // 显示结果
    const resultDiv = document.getElementById('quizResult');
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    let resultClass, resultText;
    if (percentage >= 90) {
        resultClass = 'excellent';
        resultText = `太棒了！正确率 ${percentage}%（${correct}/${total}），你已经掌握了这些单词！`;
    } else if (percentage >= 60) {
        resultClass = 'pass';
        resultText = `不错！正确率 ${percentage}%（${correct}/${total}），继续加油！`;
    } else {
        resultClass = 'fail';
        resultText = `正确率 ${percentage}%（${correct}/${total}），需要多加练习哦！`;
    }
    
    // 如果有错词，提示已加入错词本
    if (wrongWords.length > 0) {
        resultText += ` (${wrongWords.length}个错词已加入错词本)`;
    }

    resultDiv.className = `quiz-result ${resultClass}`;
    resultDiv.textContent = resultText;
    resultDiv.style.display = 'block';
}

function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    // 移除标点和空格进行比较
    const clean1 = str1.replace(/[，。、；：""''！？\s]/g, '');
    const clean2 = str2.replace(/[，。、；：""''！？\s]/g, '');
    
    if (clean1 === clean2) return 1;
    
    // 检查是否包含核心内容
    if (clean2.includes(clean1) || clean1.includes(clean2)) {
        return 0.8;
    }

    // 中文字符级别的相似度
    const chars1 = [...clean1];
    const chars2 = [...clean2];
    
    let matchCount = 0;
    chars1.forEach(c => {
        if (chars2.includes(c)) {
            matchCount++;
        }
    });

    return matchCount / Math.max(chars1.length, chars2.length);
}

function resetQuiz() {
    const inputs = document.querySelectorAll('.quiz-input');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('correct', 'incorrect');
        // 移除正确答案提示
        const nextSibling = input.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains('correct-answer')) {
            nextSibling.remove();
        }
    });
    document.getElementById('quizResult').style.display = 'none';
}

// ==================== 历史记录 ====================
function loadHistory() {
    const historyList = document.getElementById('historyList');
    const history = getHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
        return;
    }

    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item" onclick="loadHistoryItem(${index})">
            <button class="history-delete" onclick="event.stopPropagation(); deleteHistoryItem(${index})">×</button>
            <div class="history-date">${item.date}</div>
            <div class="history-words">${item.words.join(', ')}</div>
            <div class="history-preview">${item.storyPreview}</div>
        </div>
    `).join('');
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveToHistory() {
    const history = getHistory();
    
    const newItem = {
        date: new Date().toLocaleString('zh-CN'),
        words: currentWords,
        story: currentStory,
        chineseStory: currentChineseStory,
        definitions: currentDefinitions,
        storyPreview: currentStory.replace(/\*\*([a-zA-Z]+)\*\*/g, '$1').substring(0, 100) + '...'
    };

    // 添加到开头
    history.unshift(newItem);

    // 限制最大数量
    if (history.length > MAX_HISTORY) {
        history.pop();
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
}

function loadHistoryItem(index) {
    const history = getHistory();
    const item = history[index];

    if (!item) return;

    // 恢复数据
    currentWords = item.words;
    currentStory = item.story;
    currentChineseStory = item.chineseStory || '';
    currentDefinitions = item.definitions;

    // 更新输入框
    document.getElementById('wordInput').value = currentWords.join('\n');
    updateWordCount();

    // 渲染故事
    renderStory();

    // 显示故事区域
    document.getElementById('storySection').style.display = 'block';

    // 关闭侧边栏
    toggleHistory();

    // 滚动到故事区域
    document.getElementById('storySection').scrollIntoView({ behavior: 'smooth' });
}

function deleteHistoryItem(index) {
    const history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
}

function toggleHistory() {
    const sidebar = document.getElementById('historySidebar');
    const overlay = document.getElementById('overlay');
    
    // 先关闭其他侧边栏
    document.getElementById('wrongWordsSidebar').classList.remove('show');
    
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
}

// ==================== 错词本功能 ====================
function getWrongWords() {
    try {
        return JSON.parse(localStorage.getItem(WRONG_WORDS_KEY)) || [];
    } catch {
        return [];
    }
}

function saveWrongWords(wrongWords) {
    localStorage.setItem(WRONG_WORDS_KEY, JSON.stringify(wrongWords));
}

function addToWrongWords(newWords) {
    const wrongWords = getWrongWords();
    const existingWords = new Set(wrongWords.map(w => w.word.toLowerCase()));
    
    newWords.forEach(item => {
        if (!existingWords.has(item.word.toLowerCase())) {
            wrongWords.push({
                word: item.word.toLowerCase(),
                definition: item.definition,
                date: new Date().toLocaleString('zh-CN')
            });
        }
    });
    
    saveWrongWords(wrongWords);
    loadWrongWords();
}

function loadWrongWords() {
    const wrongWordsList = document.getElementById('wrongWordsList');
    const wrongWords = getWrongWords();

    if (wrongWords.length === 0) {
        wrongWordsList.innerHTML = '<div class="wrongwords-empty">暂无错词，继续加油！</div>';
        return;
    }

    wrongWordsList.innerHTML = wrongWords.map((item, index) => `
        <div class="wrongword-item" data-index="${index}" onclick="toggleWrongWordSelection(${index})">
            <input type="checkbox" class="wrongword-checkbox" data-index="${index}" onclick="event.stopPropagation()">
            <div class="wrongword-content">
                <div class="wrongword-word">${item.word}</div>
                <div class="wrongword-definition">${item.definition}</div>
                <div class="wrongword-date">${item.date}</div>
            </div>
        </div>
    `).join('');
}

function toggleWrongWordSelection(index) {
    const checkbox = document.querySelector(`.wrongword-checkbox[data-index="${index}"]`);
    const item = document.querySelector(`.wrongword-item[data-index="${index}"]`);
    
    checkbox.checked = !checkbox.checked;
    item.classList.toggle('selected', checkbox.checked);
}

function selectAllWrongWords() {
    const checkboxes = document.querySelectorAll('.wrongword-checkbox');
    const items = document.querySelectorAll('.wrongword-item');
    
    checkboxes.forEach(cb => cb.checked = true);
    items.forEach(item => item.classList.add('selected'));
}

function clearWrongWordsSelection() {
    const checkboxes = document.querySelectorAll('.wrongword-checkbox');
    const items = document.querySelectorAll('.wrongword-item');
    
    checkboxes.forEach(cb => cb.checked = false);
    items.forEach(item => item.classList.remove('selected'));
}

function deleteSelectedWrongWords() {
    const checkboxes = document.querySelectorAll('.wrongword-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('请先选择要删除的单词');
        return;
    }
    
    if (!confirm(`确定删除选中的 ${checkboxes.length} 个单词吗？`)) {
        return;
    }
    
    const wrongWords = getWrongWords();
    const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
    
    // 从后往前删除，避免索引变化
    indicesToDelete.sort((a, b) => b - a).forEach(index => {
        wrongWords.splice(index, 1);
    });
    
    saveWrongWords(wrongWords);
    loadWrongWords();
}

function generateFromWrongWords() {
    const checkboxes = document.querySelectorAll('.wrongword-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('请先选择要复习的单词');
        return;
    }
    
    const wrongWords = getWrongWords();
    const selectedWords = Array.from(checkboxes).map(cb => {
        const index = parseInt(cb.dataset.index);
        return wrongWords[index].word;
    });
    
    // 将选中的词填入输入框
    document.getElementById('wordInput').value = selectedWords.join('\n');
    updateWordCount();
    
    // 关闭错词本侧边栏
    toggleWrongWords();
    
    // 滚动到输入区域
    document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
    
    // 提示用户
    setTimeout(() => {
        if (confirm(`已加载 ${selectedWords.length} 个错词，是否立即生成故事？`)) {
            generateStory();
        }
    }, 500);
}

function toggleWrongWords() {
    const sidebar = document.getElementById('wrongWordsSidebar');
    const overlay = document.getElementById('overlay');
    
    // 先关闭其他侧边栏
    document.getElementById('historySidebar').classList.remove('show');
    
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
    
    // 如果打开，加载错词列表
    if (sidebar.classList.contains('show')) {
        loadWrongWords();
    }
}

function closeAllSidebars() {
    document.getElementById('historySidebar').classList.remove('show');
    document.getElementById('wrongWordsSidebar').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
}

// ==================== 划词翻译功能 ====================
function loadLookupCache() {
    const stored = localStorage.getItem(LOOKUP_KEY);
    if (stored) {
        try {
            lookupCache = JSON.parse(stored);
        } catch (e) {
            lookupCache = {};
        }
    }
}

function saveLookupCache() {
    // 限制缓存大小，最多保存500个单词
    const keys = Object.keys(lookupCache);
    if (keys.length > 500) {
        const keysToRemove = keys.slice(0, keys.length - 500);
        keysToRemove.forEach(k => delete lookupCache[k]);
    }
    localStorage.setItem(LOOKUP_KEY, JSON.stringify(lookupCache));
}

function initLookupFeature() {
    // 监听文本选择事件
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);
    
    // 点击其他地方关闭弹窗
    document.addEventListener('mousedown', (e) => {
        const popup = document.getElementById('lookupPopup');
        if (popup && !popup.contains(e.target)) {
            hideLookupPopup();
        }
    });
}

function handleTextSelection(e) {
    // 忽略点击弹窗内部
    const lookupPopup = document.getElementById('lookupPopup');
    const etymologyPopup = document.getElementById('etymologyPopup');
    if ((lookupPopup && lookupPopup.contains(e.target)) || 
        (etymologyPopup && etymologyPopup.contains(e.target))) {
        return;
    }
    
    // 延迟一点获取选中文本，确保选择完成
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // 检查是否是有效的英文单词（2-30个字母）
        if (selectedText && /^[a-zA-Z]{2,30}$/.test(selectedText)) {
            showLookupPopup(selectedText, e);
        }
    }, 10);
}

function showLookupPopup(word, event) {
    const popup = document.getElementById('lookupPopup');
    const wordEl = document.getElementById('lookupWord');
    const contentEl = document.getElementById('lookupContent');
    const addBtn = document.querySelector('.lookup-add-btn');
    
    currentLookupWord = word.toLowerCase();
    wordEl.textContent = word;
    
    // 重置添加按钮状态
    addBtn.textContent = '加入生词本';
    addBtn.classList.remove('added');
    
    // 获取点击位置
    let x, y;
    if (event.changedTouches) {
        x = event.changedTouches[0].clientX;
        y = event.changedTouches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    
    // 检查缓存
    if (lookupCache[currentLookupWord]) {
        contentEl.innerHTML = formatLookupResult(lookupCache[currentLookupWord]);
    } else {
        contentEl.innerHTML = '<div class="lookup-loading">查询中...</div>';
        fetchWordDefinition(word);
    }
    
    // 显示弹窗
    popup.classList.add('show');
    
    // 计算位置
    const popupRect = popup.getBoundingClientRect();
    const padding = 10;
    
    let left = x + 10;
    let top = y + 10;
    
    if (left + popupRect.width > window.innerWidth - padding) {
        left = x - popupRect.width - 10;
    }
    if (top + popupRect.height > window.innerHeight - padding) {
        top = y - popupRect.height - 10;
    }
    
    left = Math.max(padding, left);
    top = Math.max(padding, top);
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

function hideLookupPopup() {
    const popup = document.getElementById('lookupPopup');
    popup.classList.remove('show');
}

function playLookupWord() {
    if (currentLookupWord) {
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(currentLookupWord)}&type=2`;
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.log('播放失败:', err));
    }
}

// 内置常用词词典（即时查询）
const BUILTIN_DICT = {
    // 常用词汇 - 可以根据需要扩展
    "the": "定冠词，这，那",
    "be": "v. 是；存在",
    "to": "prep. 到；向；给",
    "of": "prep. 的；属于",
    "and": "conj. 和；与",
    "a": "art. 一个",
    "in": "prep. 在...里面",
    "that": "pron. 那个；conj. 那",
    "have": "v. 有；拥有",
    "i": "pron. 我",
    "it": "pron. 它",
    "for": "prep. 为了；因为",
    "not": "adv. 不；没有",
    "on": "prep. 在...上面",
    "with": "prep. 和...一起",
    "he": "pron. 他",
    "as": "prep. 作为；像",
    "you": "pron. 你；你们",
    "do": "v. 做；执行",
    "at": "prep. 在",
    "this": "pron. 这个",
    "but": "conj. 但是",
    "his": "pron. 他的",
    "by": "prep. 通过；被",
    "from": "prep. 从；来自",
    "they": "pron. 他们",
    "we": "pron. 我们",
    "say": "v. 说",
    "her": "pron. 她的",
    "she": "pron. 她",
    "or": "conj. 或者",
    "an": "art. 一个",
    "will": "v. 将要；愿意",
    "my": "pron. 我的",
    "one": "num. 一；pron. 一个人",
    "all": "adj. 所有的",
    "would": "v. 将会；愿意",
    "there": "adv. 那里",
    "their": "pron. 他们的",
    "what": "pron. 什么",
    "so": "adv. 如此；所以",
    "up": "adv. 向上",
    "out": "adv. 出去",
    "if": "conj. 如果",
    "about": "prep. 关于",
    "who": "pron. 谁",
    "get": "v. 得到；变得",
    "which": "pron. 哪个",
    "go": "v. 去；走",
    "me": "pron. 我(宾格)",
    "when": "adv. 什么时候",
    "make": "v. 制作；使得",
    "can": "v. 能够",
    "like": "v. 喜欢；prep. 像",
    "time": "n. 时间",
    "no": "adv. 不；没有",
    "just": "adv. 仅仅；刚刚",
    "him": "pron. 他(宾格)",
    "know": "v. 知道",
    "take": "v. 拿；带",
    "people": "n. 人们",
    "into": "prep. 进入",
    "year": "n. 年",
    "your": "pron. 你的",
    "good": "adj. 好的",
    "some": "adj. 一些",
    "could": "v. 能够(过去式)",
    "them": "pron. 他们(宾格)",
    "see": "v. 看见",
    "other": "adj. 其他的",
    "than": "conj. 比",
    "then": "adv. 然后",
    "now": "adv. 现在",
    "look": "v. 看",
    "only": "adv. 仅仅",
    "come": "v. 来",
    "its": "pron. 它的",
    "over": "prep. 在...上方",
    "think": "v. 想；认为",
    "also": "adv. 也",
    "back": "adv. 回；n. 背部",
    "after": "prep. 在...之后",
    "use": "v. 使用",
    "two": "num. 二",
    "how": "adv. 怎样",
    "our": "pron. 我们的",
    "work": "v. 工作；n. 工作",
    "first": "adj. 第一的",
    "well": "adv. 好；int. 嗯",
    "way": "n. 方式；路",
    "even": "adv. 甚至",
    "new": "adj. 新的",
    "want": "v. 想要",
    "because": "conj. 因为",
    "any": "adj. 任何的",
    "these": "pron. 这些",
    "give": "v. 给",
    "day": "n. 天；日",
    "most": "adj. 最多的",
    "us": "pron. 我们(宾格)",
    "environment": "n. 环境",
    "climate": "n. 气候",
    "change": "n./v. 变化；改变",
    "global": "adj. 全球的",
    "sustainable": "adj. 可持续的",
    "development": "n. 发展",
    "research": "n./v. 研究",
    "technology": "n. 技术",
    "education": "n. 教育",
    "society": "n. 社会",
    "economic": "adj. 经济的",
    "political": "adj. 政治的",
    "cultural": "adj. 文化的",
    "significant": "adj. 重要的；显著的",
    "evidence": "n. 证据",
    "analysis": "n. 分析",
    "theory": "n. 理论",
    "approach": "n./v. 方法；接近",
    "process": "n. 过程；v. 处理",
    "system": "n. 系统",
    "however": "adv. 然而",
    "therefore": "adv. 因此",
    "although": "conj. 虽然",
    "whether": "conj. 是否",
    "provide": "v. 提供",
    "require": "v. 需要；要求",
    "include": "v. 包括",
    "consider": "v. 考虑",
    "suggest": "v. 建议；暗示",
    "indicate": "v. 表明；指示",
    "achieve": "v. 实现；达到",
    "affect": "v. 影响",
    "effect": "n. 效果；影响",
    "impact": "n./v. 影响；冲击",
    "increase": "v./n. 增加",
    "decrease": "v./n. 减少",
    "improve": "v. 提高；改善",
    "reduce": "v. 减少",
    "maintain": "v. 维持；保持",
    "determine": "v. 决定；确定",
    "establish": "v. 建立",
    "individual": "n. 个人；adj. 个人的",
    "community": "n. 社区；共同体",
    "government": "n. 政府",
    "international": "adj. 国际的",
    "national": "adj. 国家的",
    "local": "adj. 当地的",
    "specific": "adj. 具体的；特定的",
    "particular": "adj. 特别的；特定的",
    "general": "adj. 一般的；总的",
    "common": "adj. 共同的；普通的",
    "similar": "adj. 相似的",
    "different": "adj. 不同的",
    "important": "adj. 重要的",
    "necessary": "adj. 必要的",
    "possible": "adj. 可能的",
    "available": "adj. 可用的",
    "likely": "adj. 可能的",
    "potential": "adj. 潜在的；n. 潜力"
};

async function fetchWordDefinition(word) {
    const lowerWord = word.toLowerCase();
    
    // 1. 首先检查内置词典（即时）
    if (BUILTIN_DICT[lowerWord]) {
        const result = {
            word: word,
            phonetic: '',
            definitions: [{ pos: '', meaning: BUILTIN_DICT[lowerWord] }]
        };
        lookupCache[lowerWord] = result;
        saveLookupCache();
        updateLookupDisplay(lowerWord, result);
        return;
    }
    
    // 2. 尝试 Free Dictionary API（快速、无跨域）
    try {
        const result = await fetchFreeDictionaryAPI(word);
        if (result) {
            lookupCache[lowerWord] = result;
            saveLookupCache();
            updateLookupDisplay(lowerWord, result);
            return;
        }
    } catch (err) {
        console.log('Free Dictionary API失败:', err.message);
    }
    
    // 3. 备用方案：使用AI API
    await fetchWordDefinitionAI(word);
}

function updateLookupDisplay(lowerWord, result) {
    const contentEl = document.getElementById('lookupContent');
    const currentWord = document.getElementById('lookupWord').textContent.toLowerCase();
    if (currentWord === lowerWord) {
        contentEl.innerHTML = formatLookupResult(result);
    }
}

// Free Dictionary API（免费、快速、支持跨域）
async function fetchFreeDictionaryAPI(word) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            if (response.status === 404) {
                return null; // 单词不存在
            }
            throw new Error('请求失败');
        }
        
        const data = await response.json();
        
        if (data && data[0]) {
            const entry = data[0];
            const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0] && entry.phonetics[0].text) || '';
            
            const definitions = [];
            if (entry.meanings) {
                entry.meanings.forEach(meaning => {
                    const pos = meaning.partOfSpeech || '';
                    if (meaning.definitions && meaning.definitions[0]) {
                        definitions.push({
                            pos: pos,
                            meaning: meaning.definitions[0].definition // 英文释义
                        });
                    }
                });
            }
            
            return {
                word: word,
                phonetic: phonetic,
                definitions: definitions.length > 0 ? definitions : [{ pos: '', meaning: 'No definition found' }]
            };
        }
        
        return null;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// AI API备用方案
async function fetchWordDefinitionAI(word) {
    const settings = loadSettings();
    
    if (!settings.apiKey) {
        const contentEl = document.getElementById('lookupContent');
        contentEl.innerHTML = '<div class="lookup-definition">未找到释义</div>';
        return;
    }
    
    const provider = settings.provider || 'openai';
    let apiUrl, model;
    
    if (provider === 'custom') {
        apiUrl = settings.customUrl;
        model = settings.model || 'gpt-3.5-turbo';
    } else {
        apiUrl = API_CONFIGS[provider].url;
        model = settings.model || API_CONFIGS[provider].defaultModel;
    }
    
    const prompt = `翻译英文单词"${word}"，返回JSON（无代码块）：
{"word":"${word}","phonetic":"音标","definitions":[{"pos":"词性","meaning":"中文释义"}]}
要求简洁。`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('解析失败');
            }
        }
        
        // 缓存结果
        lookupCache[currentLookupWord] = result;
        saveLookupCache();
        updateLookupDisplay(currentLookupWord, result);
    } catch (err) {
        console.error('查询单词失败:', err);
        const contentEl = document.getElementById('lookupContent');
        if (err.name === 'AbortError') {
            contentEl.innerHTML = '<div class="lookup-definition">查询超时</div>';
        } else {
            contentEl.innerHTML = '<div class="lookup-definition">未找到释义</div>';
        }
    }
}

function formatLookupResult(result) {
    let html = '';
    
    if (result.phonetic) {
        html += `<div class="lookup-phonetic">${result.phonetic}</div>`;
    }
    
    if (result.definitions && result.definitions.length > 0) {
        result.definitions.forEach(def => {
            html += `<div class="lookup-definition">`;
            if (def.pos) {
                html += `<span class="lookup-pos">${def.pos}</span>`;
            }
            html += `${def.meaning}</div>`;
        });
    } else if (result.meaning) {
        html += `<div class="lookup-definition">${result.meaning}</div>`;
    }
    
    return html || '<div class="lookup-definition">暂无释义</div>';
}

function addLookupWordToList() {
    if (!currentLookupWord) return;
    
    const addBtn = document.querySelector('.lookup-add-btn');
    if (addBtn.classList.contains('added')) return;
    
    // 获取当前输入框的内容
    const wordInput = document.getElementById('wordInput');
    const currentText = wordInput.value.trim();
    
    // 检查是否已存在
    const existingWords = currentText.split(/[\s,，、;；\n]+/).filter(w => w.trim());
    if (existingWords.map(w => w.toLowerCase()).includes(currentLookupWord)) {
        addBtn.textContent = '已存在';
        addBtn.classList.add('added');
        return;
    }
    
    // 添加到输入框
    if (currentText) {
        wordInput.value = currentText + '\n' + currentLookupWord;
    } else {
        wordInput.value = currentLookupWord;
    }
    
    // 触发字数统计更新
    wordInput.dispatchEvent(new Event('input'));
    
    // 更新按钮状态
    addBtn.textContent = '已添加';
    addBtn.classList.add('added');
}
