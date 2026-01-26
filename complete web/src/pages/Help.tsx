import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopMenu from "@/components/TopMenu";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Search, 
  HelpCircle, 
  BookOpen, 
  CreditCard, 
  Wand2,
  MessageSquare
} from "lucide-react";

const faqCategories = [
  {
    title: "Getting Started",
    icon: BookOpen,
    questions: [
      {
        q: "How do I create my first image?",
        a: "Navigate to the 'Create' page and select 'Image'. Enter a text description of what you want to generate, choose a model, and click 'Generate'. Your image will be ready in seconds!"
      },
      {
        q: "What AI models are available?",
        a: "We offer multiple AI models for different purposes: image generation (DALL-E, Flux), video generation, music creation, and more. Each model has unique strengths - explore them in the Create page."
      },
      {
        q: "How do I save my creations?",
        a: "All your generations are automatically saved to your Library. You can access them anytime from the Library page, download them, or share them."
      }
    ]
  },
  {
    title: "Billing & Credits",
    icon: CreditCard,
    questions: [
      {
        q: "How do credits work?",
        a: "Credits are used for AI generations. Different operations cost different amounts - images typically cost 1-2 credits, videos cost more. You get free credits when you sign up, and can purchase more or subscribe for unlimited generations."
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment provider Stripe."
      },
      {
        q: "Can I get a refund?",
        a: "Unused credits from one-time purchases can be refunded within 14 days. Subscription refunds are handled on a case-by-case basis. Contact support for assistance."
      }
    ]
  },
  {
    title: "Generation & Tools",
    icon: Wand2,
    questions: [
      {
        q: "Why did my generation fail?",
        a: "Generations can fail due to content policy violations, server load, or connectivity issues. Try rephrasing your prompt or try again in a few minutes. Failed generations don't consume credits."
      },
      {
        q: "How do I get better results?",
        a: "Be specific in your prompts! Include details about style, lighting, composition. Use negative prompts to exclude unwanted elements. Experiment with different models for different styles."
      },
      {
        q: "What are the resolution limits?",
        a: "Standard images are generated at 1024x1024. With Pro subscription, you can upscale to 4K resolution. Videos are generated in various aspect ratios up to 1080p."
      }
    ]
  }
];

const Help = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQs by search query
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />
      
      <main className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Help & FAQ</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Find answers to common questions about using Timeless.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search FAQ..."
              className="pl-10 h-12 bg-secondary border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Need more help banner */}
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">Can't find what you're looking for?</span>
              </div>
              <Button onClick={() => navigate("/support")} size="sm">
                Contact Support
              </Button>
            </CardContent>
          </Card>

          {/* FAQ Sections */}
          <div className="grid gap-6">
            {(searchQuery ? filteredCategories : faqCategories).map((category) => (
              <Card key={category.title} className="bg-card/50 border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                        <AccordionTrigger className="text-left hover:no-underline hover:text-primary">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}

            {searchQuery && filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No results found for "{searchQuery}"</p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Help;
