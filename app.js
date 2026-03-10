// ==================== 全局变量 ====================
let currentWords = [];
let currentStory = '';
let currentChineseStory = '';
let currentDefinitions = {};
const HISTORY_KEY = 'wordMemoryHistory';
const SETTINGS_KEY = 'wordMemorySettings';
const WRONG_WORDS_KEY = 'wordMemoryWrongWords';
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
    
    const prompt = `你是一个专业的英语教师，擅长用有趣的故事帮助学生记忆单词。

请根据以下单词列表，创作一个有趣、连贯的英文短故事（150-300词）：

单词列表：${words.join(', ')}

要求：
1. 所有单词都必须自然地融入故事中
2. 单词要分散在故事的各个位置，不要堆积在开头或结尾
3. 故事要有逻辑性和趣味性，适合阅读记忆
4. 每个单词在故事中用 **word** 格式标记（用双星号包围）
5. [STORY]部分必须是纯英文，不要包含任何中文字符
6. [DEFINITIONS]部分必须为每一个单词提供中文释义，不能遗漏任何单词
7. [CHINESE]部分提供故事的完整中文翻译

请严格按以下格式输出：

[STORY]
(纯英文故事，单词用**word**标记，不要有任何中文)

[DEFINITIONS]
word1: 中文释义
word2: 中文释义
（必须包含所有 ${words.length} 个单词的释义，每行一个）

[CHINESE]
故事的完整中文翻译`;

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
}

// 创建带语音的单词元素
function createWordWithTooltip(word, showDefinitionInline = false) {
    const lowerWord = word.toLowerCase();
    const definition = currentDefinitions[lowerWord] || '暂无释义';
    
    let html = `<span class="highlight" data-word="${lowerWord}" onclick="speakWord('${word}')">`;
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
function speakWord(word) {
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
}
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
        let result = `<span class="highlight" data-word="${lowerWord}" onclick="speakWord('${word}')">`;
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
