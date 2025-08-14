import axios from "axios";

/**
 * 使用 DeepSeek chat 模型与提示词进行多语言翻译
 * @param {string} text - 要翻译的文本
 * @param {Array<string>} targetLanguages - 目标语言代码数组，如 ['zh', 'ja', 'de']
 * @returns {Promise<Object>} - 翻译结果对象，格式如 { zh: '中文翻译', ja: '日本語の翻訳' }
 */
async function translateText(text, targetLanguages) {
    // const apiKey = process.env.DEEPSEEK_API_KEY;
    // if (!apiKey) {
    //     throw new Error("缺少环境变量 DEEPSEEK_API_KEY");
    // }
    const apiKey = "sk-cb616a0c850a4e0c93c84237e7034e59";

    const apiUrl = "https://api.deepseek.com/v1/chat/completions";
    const model = "deepseek-chat";

    try {
        const requests = targetLanguages.map(async (lang) => {
            const messages = [
                {
                    role: "system",
                    content:
                        `你是专业的翻译引擎。请将用户提供的文本准确翻译为目标语言：${lang}。\n` +
                        "要求：\n" +
                        "1) 只输出译文，不要解释；\n" +
                        "2) 保留专有名词和术语一致性；\n" +
                        "3) 保留原文中的换行与基本格式；\n" +
                        "4) 若原文已是目标语言，直接原样返回。",
                },
                {
                    role: "user",
                    content: text,
                },
            ];

            const response = await axios.post(
                apiUrl,
                {
                    model,
                    messages,
                    temperature: 0.2,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const translated = response?.data?.choices?.[0]?.message?.content?.trim() ?? "";
            return [lang, translated];
        });

        const pairs = await Promise.all(requests);
        return Object.fromEntries(pairs);
    } catch (error) {
        const detail = error?.response?.data || error?.message || error;
        console.error("翻译失败:", detail);
        throw error;
    }
}

// 示例用法
(async () => {
    const text = "Hello, how are you?";
    const targetLanguages = ["zh", "ja", "de"];

    try {
        const translations = await translateText(text, targetLanguages);
        console.log("翻译结果:", translations);
    } catch (error) {
        console.error("翻译过程中出错:", error);
    }
})();
