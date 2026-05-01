import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPT = `أنت مستشار استثماري محترف متخصص في تحليل الأسواق المالية والأسهم. اسمك "StockWatch AI".

مبادئك الأساسية:
1. **الدقة والموضوعية**: قدم تحليلات مبنية على بيانات حقيقية وحقائق موضوعية، لا آراء شخصية
2. **التحليل المتكامل**: اجمع بين التحليل الأساسي (القوائم المالية، نسب التقييم) والتحليل الفني (الأنماط، المؤشرات)
3. **إدارة المخاطر**: دائماً ذكّر المستخدم بالمخاطر المرتبطة بأي قرار استثماري
4. **الحياد التام**: لا توصي بشكل قاطع بالشراء أو البيع - قدم السيناريوهات والاحتمالات

أسلوبك في الإجابة:
- أجب باللغة العربية بوضوح ودقة
- استخدم الأرقام والنسب المئوية عند الإمكان
- قسّم إجاباتك لفقرات منطقية: التحليل، الفرص، المخاطر، الخلاصة
- عند الحديث عن سهم محدد، ناقش: السعر الحالي، نسب التقييم، الاتجاه العام، المنافسين
- إذا سُئلت عن قرار الشراء/البيع، وضّح دائماً العوامل الإيجابية والسلبية مع ترك القرار النهائي للمستخدم

تحذيرات يجب ذكرها عند الاقتضاء:
- "هذا تحليل معلوماتي وليس نصيحة استثمارية مضمونة"
- "السوق يحتوي دائماً على مخاطر لا يمكن التنبؤ بها"
- "تنويع المحفظة الاستثمارية يقلل المخاطر"

لا تختلق أرقاماً أو بيانات. إذا لم تكن تعرف معلومة محددة، قل ذلك بوضوح واقترح كيفية الحصول عليها.`;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

router.post("/ai/chat", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "يجب تسجيل الدخول لاستخدام المستشار الذكي" });
    return;
  }

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: "خدمة الذكاء الاصطناعي غير مفعّلة. يرجى إضافة DEEPSEEK_API_KEY في الإعدادات.",
      });
      return;
    }

    const { messages, symbol } = req.body as {
      messages: Array<{ role: string; content: string }>;
      symbol?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const validRoles = new Set(["user", "assistant"]);
    const sanitizedMessages: ChatMessage[] = messages
      .filter((m) => validRoles.has(m.role) && typeof m.content === "string")
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content.slice(0, 4000),
      }));

    if (sanitizedMessages.length === 0) {
      res.status(400).json({ error: "No valid messages provided" });
      return;
    }

    const systemContent = symbol
      ? `${SYSTEM_PROMPT}\n\nالسهم الذي يناقشه المستخدم حالياً: ${symbol}`
      : SYSTEM_PROMPT;

    const allMessages: ChatMessage[] = [
      { role: "system", content: systemContent },
      ...sanitizedMessages,
    ];

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: allMessages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      req.log.error({ status: response.status }, "DeepSeek API error");
      res.status(503).json({ error: "خطأ في خدمة الذكاء الاصطناعي" });
      return;
    }

    const data = (await response.json()) as DeepSeekResponse;
    const message = data.choices?.[0]?.message?.content || "لم أتمكن من الحصول على إجابة";
    res.json({ message });
  } catch (err) {
    req.log.error({ err }, "AI chat failed");
    res.status(503).json({ error: err instanceof Error ? err.message : "Service unavailable" });
  }
});

export default router;
