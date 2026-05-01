import { useState, useRef, useEffect } from "react";
import { useSendAiChatMessage } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Send, Bot, User, MessageSquare, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const { user, isLoading: authLoading, login } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا مستشارك المالي الذكي لتحليل الأسهم. يمكنني مساعدتك في تحليل الأسهم وفهم مؤشرات السوق وتقديم نصائح استثمارية مبنية على البيانات. بماذا يمكنني مساعدتك اليوم؟",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useSendAiChatMessage({
    mutation: {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message ?? "عذراً، حدث خطأ في الرد.",
            timestamp: new Date(),
          },
        ]);
      },
      onError: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
            timestamp: new Date(),
          },
        ]);
      },
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text || mutation.isPending) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const allMessages = [
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: text },
    ];

    mutation.mutate({
      data: { messages: allMessages },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">المستشار الذكي</h2>
          <p className="text-muted-foreground max-w-sm">
            سجّل دخولك للتحدث مع مستشارك المالي الذكي المتخصص في تحليل الأسهم
          </p>
          <Button onClick={login} className="gap-2">
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-6 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">المستشار الذكي</h2>
            <p className="text-xs text-muted-foreground">مستشار مالي متخصص في الأسهم • متاح دائماً</p>
          </div>
          <div className="mr-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">متصل</span>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3 items-start",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
              <AvatarFallback className={cn(
                "text-xs font-bold",
                msg.role === "assistant" ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
              )}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>

            <div className={cn(
              "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "assistant"
                ? "bg-card border border-card-border text-card-foreground rounded-tr-sm"
                : "bg-primary text-primary-foreground rounded-tl-sm"
            )}>
              {msg.content}
              <div className={cn(
                "text-xs mt-1.5 opacity-50",
                msg.role === "user" ? "text-right" : "text-left"
              )}>
                {msg.timestamp.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {mutation.isPending && (
          <div className="flex gap-3 items-start">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-card border border-card-border rounded-2xl rounded-tr-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            placeholder="اسألني عن أي سهم أو استراتيجية استثمارية..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[44px] max-h-32 focus-visible:ring-primary"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || mutation.isPending}
            size="sm"
            className="h-11 w-11 p-0 flex-shrink-0"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          للمعلومات فقط • ليس نصيحة استثمارية رسمية
        </p>
      </div>
    </div>
  );
}
