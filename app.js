// ==================== 全局变量 ====================
let currentWords = [];
let currentStory = '';
let currentChineseStory = '';
let currentDefinitions = {};
let lookupCache = {};
let currentLookupWord = '';
const HISTORY_KEY = 'wordMemoryHistory';
const SETTINGS_KEY = 'wordMemorySettings';
const WRONG_WORDS_KEY = 'wordMemoryWrongWords';
const LOOKUP_KEY = 'wordMemoryLookup';
const MAX_HISTORY = 50;

// 内置常用词典（静态数据，秒级响应）
const BUILTIN_DICT = {
    // 常用动词
    "achieve": "v. 实现，达到",
    "analyze": "v. 分析",
    "apply": "v. 应用，申请",
    "approach": "v./n. 接近，方法",
    "assess": "v. 评估",
    "assume": "v. 假设，承担",
    "benefit": "v./n. 受益，好处",
    "challenge": "n./v. 挑战",
    "compare": "v. 比较",
    "conclude": "v. 得出结论",
    "conduct": "v. 进行，引导",
    "consider": "v. 考虑",
    "contribute": "v. 贡献，促成",
    "create": "v. 创造",
    "define": "v. 定义",
    "demonstrate": "v. 证明，展示",
    "describe": "v. 描述",
    "determine": "v. 决定，确定",
    "develop": "v. 发展，开发",
    "discuss": "v. 讨论",
    "emphasize": "v. 强调",
    "ensure": "v. 确保",
    "establish": "v. 建立",
    "evaluate": "v. 评价",
    "examine": "v. 检查，审查",
    "explain": "v. 解释",
    "explore": "v. 探索",
    "express": "v. 表达",
    "focus": "v./n. 专注，焦点",
    "identify": "v. 识别，确定",
    "illustrate": "v. 说明，阐述",
    "impact": "n./v. 影响，冲击",
    "implement": "v. 实施",
    "imply": "v. 暗示",
    "improve": "v. 改善",
    "include": "v. 包含",
    "increase": "v./n. 增加",
    "indicate": "v. 表明，指出",
    "influence": "n./v. 影响",
    "interpret": "v. 解释，口译",
    "introduce": "v. 介绍，引入",
    "investigate": "v. 调查",
    "involve": "v. 包含，涉及",
    "maintain": "v. 维持，保持",
    "measure": "v./n. 测量，措施",
    "observe": "v. 观察",
    "obtain": "v. 获得",
    "occur": "v. 发生",
    "participate": "v. 参与",
    "perform": "v. 执行，表演",
    "predict": "v. 预测",
    "present": "v./adj. 呈现，当前的",
    "prevent": "v. 防止",
    "produce": "v. 生产，产生",
    "promote": "v. 促进，推广",
    "propose": "v. 提议",
    "protect": "v. 保护",
    "provide": "v. 提供",
    "publish": "v. 出版，发布",
    "reach": "v. 达到",
    "recognize": "v. 识别，承认",
    "recommend": "v. 推荐",
    "reduce": "v. 减少",
    "reflect": "v. 反映，反思",
    "regard": "v. 认为，看待",
    "relate": "v. 关联，叙述",
    "rely": "v. 依赖",
    "remain": "v. 保持，留下",
    "replace": "v. 替代",
    "report": "v./n. 报告",
    "represent": "v. 代表",
    "require": "v. 需要，要求",
    "research": "n./v. 研究",
    "respond": "v. 回应",
    "result": "n./v. 结果，导致",
    "reveal": "v. 揭示",
    "review": "v./n. 回顾，评论",
    "solve": "v. 解决",
    "suggest": "v. 建议，暗示",
    "support": "v./n. 支持",
    "survey": "n./v. 调查",
    "tend": "v. 倾向",
    "transform": "v. 转变",
    // 常用名词
    "analysis": "n. 分析",
    "approach": "n./v. 方法，接近",
    "area": "n. 领域，地区",
    "aspect": "n. 方面",
    "behavior": "n. 行为",
    "concept": "n. 概念",
    "consequence": "n. 结果，后果",
    "context": "n. 语境，背景",
    "culture": "n. 文化",
    "data": "n. 数据",
    "development": "n. 发展",
    "economy": "n. 经济",
    "education": "n. 教育",
    "effect": "n. 效果，影响",
    "environment": "n. 环境",
    "evidence": "n. 证据",
    "example": "n. 例子",
    "experience": "n./v. 经验，经历",
    "factor": "n. 因素",
    "feature": "n. 特征",
    "function": "n./v. 功能，运作",
    "growth": "n. 增长",
    "health": "n. 健康",
    "individual": "n./adj. 个人，个体的",
    "industry": "n. 工业，行业",
    "information": "n. 信息",
    "issue": "n. 问题，议题",
    "knowledge": "n. 知识",
    "level": "n. 水平，层次",
    "method": "n. 方法",
    "nature": "n. 自然，本质",
    "opportunity": "n. 机会",
    "period": "n. 时期",
    "perspective": "n. 视角，观点",
    "policy": "n. 政策",
    "population": "n. 人口",
    "potential": "n./adj. 潜力，潜在的",
    "practice": "n./v. 实践，练习",
    "principle": "n. 原则",
    "problem": "n. 问题",
    "process": "n./v. 过程，处理",
    "progress": "n./v. 进展",
    "project": "n./v. 项目，设计",
    "quality": "n. 质量",
    "range": "n./v. 范围",
    "rate": "n. 率，速度",
    "region": "n. 地区",
    "relationship": "n. 关系",
    "resource": "n. 资源",
    "response": "n. 回应",
    "role": "n. 角色，作用",
    "section": "n. 部分",
    "situation": "n. 情况",
    "society": "n. 社会",
    "solution": "n. 解决方案",
    "source": "n. 来源",
    "strategy": "n. 策略",
    "structure": "n./v. 结构",
    "study": "n./v. 研究，学习",
    "system": "n. 系统",
    "technology": "n. 技术",
    "theory": "n. 理论",
    "trend": "n. 趋势",
    "value": "n./v. 价值，重视",
    "view": "n./v. 观点，观看",
    // 常用形容词
    "available": "adj. 可用的",
    "complex": "adj. 复杂的",
    "critical": "adj. 关键的，批判的",
    "current": "adj. 当前的",
    "effective": "adj. 有效的",
    "essential": "adj. 必要的，本质的",
    "global": "adj. 全球的",
    "major": "adj. 主要的",
    "necessary": "adj. 必要的",
    "negative": "adj. 消极的，否定的",
    "positive": "adj. 积极的，肯定的",
    "primary": "adj. 主要的，初级的",
    "significant": "adj. 重要的，显著的",
    "similar": "adj. 相似的",
    "social": "adj. 社会的",
    "specific": "adj. 具体的，特定的",
    "traditional": "adj. 传统的",
    "various": "adj. 各种的",
    // 常用副词
    "actually": "adv. 实际上",
    "especially": "adv. 尤其",
    "eventually": "adv. 最终",
    "frequently": "adv. 频繁地",
    "generally": "adv. 一般地",
    "however": "adv. 然而",
    "increasingly": "adv. 越来越",
    "moreover": "adv. 此外",
    "particularly": "adv. 特别地",
    "previously": "adv. 之前",
    "significantly": "adv. 显著地",
    "therefore": "adv. 因此",
    // 雅思高频词汇
    "abundant": "adj. 丰富的",
    "accelerate": "v. 加速",
    "accommodate": "v. 容纳，适应",
    "accumulate": "v. 积累",
    "accurate": "adj. 准确的",
    "acknowledge": "v. 承认",
    "acquire": "v. 获得",
    "adapt": "v. 适应",
    "adequate": "adj. 足够的",
    "advocate": "v./n. 提倡，支持者",
    "affect": "v. 影响",
    "allocate": "v. 分配",
    "alternative": "n./adj. 替代方案，可替代的",
    "ambiguous": "adj. 模糊的",
    "anticipate": "v. 预期",
    "apparent": "adj. 明显的",
    "appreciate": "v. 欣赏，感激",
    "appropriate": "adj. 适当的",
    "approximate": "adj./v. 大约的，接近",
    "attribute": "v./n. 归因于，属性",
    "capable": "adj. 有能力的",
    "clarify": "v. 阐明",
    "collaborate": "v. 合作",
    "compensate": "v. 补偿",
    "comprehensive": "adj. 全面的",
    "concentrate": "v. 专注",
    "confirm": "v. 确认",
    "considerable": "adj. 相当大的",
    "consistent": "adj. 一致的",
    "constitute": "v. 构成",
    "constraint": "n. 限制",
    "consume": "v. 消费，消耗",
    "contemporary": "adj. 当代的",
    "contradict": "v. 矛盾",
    "controversy": "n. 争议",
    "convenient": "adj. 方便的",
    "conventional": "adj. 传统的，常规的",
    "convince": "v. 说服",
    "correspond": "v. 符合，通信",
    "crucial": "adj. 至关重要的",
    "decline": "v./n. 下降，拒绝",
    "dedicate": "v. 致力于",
    "deficit": "n. 赤字，缺乏",
    "derive": "v. 获得，源于",
    "despite": "prep. 尽管",
    "detect": "v. 检测",
    "devote": "v. 致力于",
    "diminish": "v. 减少",
    "distinct": "adj. 明显的，不同的",
    "distribute": "v. 分配，分布",
    "diverse": "adj. 多样的",
    "domestic": "adj. 国内的，家庭的",
    "dominant": "adj. 占主导地位的",
    "dramatic": "adj. 引人注目的，剧烈的",
    "efficient": "adj. 有效率的",
    "eliminate": "v. 消除",
    "emerge": "v. 出现",
    "emit": "v. 排放，发射",
    "enable": "v. 使能够",
    "encounter": "v./n. 遇到",
    "enhance": "v. 增强",
    "enormous": "adj. 巨大的",
    "exceed": "v. 超过",
    "exclude": "v. 排除",
    "exhibit": "v./n. 展示，展览",
    "expand": "v. 扩展",
    "exploit": "v. 利用，剥削",
    "expose": "v. 暴露，接触",
    "extend": "v. 延伸，扩展",
    "external": "adj. 外部的",
    "facilitate": "v. 促进",
    "flexible": "adj. 灵活的",
    "fluctuate": "v. 波动",
    "fundamental": "adj. 基本的",
    "generate": "v. 产生",
    "hence": "adv. 因此",
    "hypothesis": "n. 假设",
    "ignore": "v. 忽视",
    "illustrate": "v. 说明",
    "immigrate": "v. 移民",
    "impose": "v. 强加，征税",
    "incredible": "adj. 难以置信的",
    "inevitable": "adj. 不可避免的",
    "inherit": "v. 继承",
    "initial": "adj. 最初的",
    "innovate": "v. 创新",
    "insight": "n. 洞察力",
    "instance": "n. 例子",
    "integrate": "v. 整合",
    "intense": "adj. 强烈的",
    "interact": "v. 互动",
    "internal": "adj. 内部的",
    "intervene": "v. 干预",
    "isolate": "v. 隔离",
    "justify": "v. 证明正当",
    "launch": "v./n. 发起，发射",
    "layer": "n. 层",
    "legal": "adj. 法律的",
    "likewise": "adv. 同样地",
    "locate": "v. 位于，确定位置",
    "logic": "n. 逻辑",
    "mature": "adj./v. 成熟的",
    "mechanism": "n. 机制",
    "modify": "v. 修改",
    "monitor": "v./n. 监控",
    "neglect": "v. 忽视",
    "nevertheless": "adv. 然而",
    "notion": "n. 概念",
    "obvious": "adj. 明显的",
    "occupy": "v. 占据",
    "oppose": "v. 反对",
    "option": "n. 选择",
    "outcome": "n. 结果",
    "overall": "adj./adv. 总体的",
    "overcome": "v. 克服",
    "overlook": "v. 忽视",
    "parallel": "adj./n. 平行的",
    "perceive": "v. 感知",
    "permanent": "adj. 永久的",
    "persist": "v. 坚持",
    "phenomenon": "n. 现象",
    "pioneer": "n./v. 先驱",
    "possess": "v. 拥有",
    "precise": "adj. 精确的",
    "preserve": "v. 保存，保护",
    "priority": "n. 优先权",
    "proceed": "v. 继续进行",
    "profound": "adj. 深刻的",
    "prohibit": "v. 禁止",
    "prominent": "adj. 突出的，著名的",
    "prospect": "n. 前景",
    "pursue": "v. 追求",
    "radical": "adj. 激进的，根本的",
    "random": "adj. 随机的",
    "rational": "adj. 理性的",
    "recover": "v. 恢复",
    "refine": "v. 精炼，改进",
    "regulate": "v. 调节，管理",
    "reinforce": "v. 加强",
    "reject": "v. 拒绝",
    "relevant": "adj. 相关的",
    "reliable": "adj. 可靠的",
    "reluctant": "adj. 不情愿的",
    "remarkable": "adj. 显著的",
    "restrict": "v. 限制",
    "retain": "v. 保留",
    "reverse": "v./adj. 逆转",
    "revise": "v. 修订",
    "revolution": "n. 革命",
    "rigid": "adj. 严格的，僵硬的",
    "scheme": "n./v. 计划，方案",
    "scope": "n. 范围",
    "secure": "adj./v. 安全的，获得",
    "seek": "v. 寻求",
    "shift": "v./n. 转移，转变",
    "shrink": "v. 缩小",
    "simulate": "v. 模拟",
    "simultaneously": "adv. 同时地",
    "sole": "adj. 唯一的",
    "sophisticated": "adj. 复杂的，精密的",
    "stable": "adj. 稳定的",
    "status": "n. 地位，状态",
    "stimulate": "v. 刺激",
    "straightforward": "adj. 简单的，直接的",
    "subordinate": "adj./n. 次要的，下属",
    "subsequent": "adj. 随后的",
    "substantial": "adj. 大量的，实质的",
    "substitute": "n./v. 替代品，替代",
    "sufficient": "adj. 足够的",
    "supplement": "n./v. 补充",
    "sustain": "v. 维持",
    "symbol": "n. 象征",
    "target": "n./v. 目标",
    "technique": "n. 技术",
    "temporary": "adj. 临时的",
    "terminate": "v. 终止",
    "theme": "n. 主题",
    "threat": "n. 威胁",
    "trace": "v./n. 追溯，痕迹",
    "transfer": "v./n. 转移",
    "transmit": "v. 传输",
    "transparent": "adj. 透明的",
    "trigger": "v./n. 触发",
    "ultimate": "adj. 最终的",
    "undergo": "v. 经历",
    "underlie": "v. 构成基础",
    "undertake": "v. 承担",
    "uniform": "adj./n. 统一的，制服",
    "unique": "adj. 独特的",
    "utilize": "v. 利用",
    "valid": "adj. 有效的",
    "vary": "v. 变化",
    "venture": "n./v. 冒险",
    "via": "prep. 通过",
    "violate": "v. 违反",
    "virtual": "adj. 实际上的，虚拟的",
    "visible": "adj. 可见的",
    "vital": "adj. 至关重要的",
    "voluntary": "adj. 自愿的",
    "welfare": "n. 福利",
    "whereas": "conj. 然而，鉴于",
    "widespread": "adj. 广泛的",
    "withdraw": "v. 撤回，取款",
    "yield": "v./n. 产生，产量"
};

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
    const keys = Object.keys(lookupCache);
    if (keys.length > 500) {
        const keysToRemove = keys.slice(0, keys.length - 500);
        keysToRemove.forEach(k => delete lookupCache[k]);
    }
    localStorage.setItem(LOOKUP_KEY, JSON.stringify(lookupCache));
}

function initLookupFeature() {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);
    
    document.addEventListener('mousedown', (e) => {
        const popup = document.getElementById('lookupPopup');
        if (popup && !popup.contains(e.target)) {
            hideLookupPopup();
        }
    });
}

function handleTextSelection(e) {
    const lookupPopup = document.getElementById('lookupPopup');
    if (lookupPopup && lookupPopup.contains(e.target)) {
        return;
    }
    
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
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
    
    addBtn.textContent = '加入生词本';
    addBtn.classList.remove('added');
    
    let x, y;
    if (event.changedTouches) {
        x = event.changedTouches[0].clientX;
        y = event.changedTouches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    
    // 优先检查内置词典（瞬间响应）
    if (BUILTIN_DICT[currentLookupWord]) {
        contentEl.innerHTML = `<div class="lookup-definition">${BUILTIN_DICT[currentLookupWord]}</div>`;
    } else if (lookupCache[currentLookupWord]) {
        contentEl.innerHTML = formatLookupResult(lookupCache[currentLookupWord]);
    } else {
        contentEl.innerHTML = '<div class="lookup-loading">查询中...</div>';
        fetchWordDefinition(word);
    }
    
    popup.classList.add('show');
    
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

async function fetchWordDefinition(word) {
    const lowerWord = word.toLowerCase();
    
    // 使用 Free Dictionary API（免费、无跨域）
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            if (data && data[0]) {
                const entry = data[0];
                const result = {
                    word: word,
                    phonetic: entry.phonetic || (entry.phonetics && entry.phonetics[0] && entry.phonetics[0].text) || '',
                    definitions: []
                };
                
                // 提取释义
                if (entry.meanings) {
                    entry.meanings.forEach(meaning => {
                        if (meaning.definitions && meaning.definitions[0]) {
                            result.definitions.push({
                                pos: meaning.partOfSpeech || '',
                                meaning: meaning.definitions[0].definition || ''
                            });
                        }
                    });
                }
                
                // 缓存并显示
                lookupCache[lowerWord] = result;
                saveLookupCache();
                
                const contentEl = document.getElementById('lookupContent');
                const currentWord = document.getElementById('lookupWord').textContent.toLowerCase();
                if (currentWord === lowerWord) {
                    contentEl.innerHTML = formatLookupResult(result);
                }
                return;
            }
        }
    } catch (err) {
        console.log('Free Dictionary API失败:', err.message);
    }
    
    // 如果API失败，显示提示
    const contentEl = document.getElementById('lookupContent');
    contentEl.innerHTML = '<div class="lookup-definition">未找到释义</div>';
}

function formatLookupResult(result) {
    let html = '';
    
    if (result.phonetic) {
        html += `<div class="lookup-phonetic">${result.phonetic}</div>`;
    }
    
    if (result.definitions && result.definitions.length > 0) {
        result.definitions.slice(0, 3).forEach(def => {
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
    
    const wordInput = document.getElementById('wordInput');
    const currentText = wordInput.value.trim();
    
    const existingWords = currentText.split(/[\s,，、;；\n]+/).filter(w => w.trim());
    if (existingWords.map(w => w.toLowerCase()).includes(currentLookupWord)) {
        addBtn.textContent = '已存在';
        addBtn.classList.add('added');
        return;
    }
    
    if (currentText) {
        wordInput.value = currentText + '\n' + currentLookupWord;
    } else {
        wordInput.value = currentLookupWord;
    }
    
    wordInput.dispatchEvent(new Event('input'));
    
    addBtn.textContent = '已添加';
    addBtn.classList.add('added');
}
