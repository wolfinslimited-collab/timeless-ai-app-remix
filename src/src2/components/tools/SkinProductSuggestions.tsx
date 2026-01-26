import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ExternalLink, Star } from "lucide-react";

interface SkinConcern {
  name: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

interface ProductSuggestion {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  price: string;
  rating: number;
  forConcerns: string[];
  forSkinTypes: string[];
  description: string;
  link?: string;
}

// Product database with images
const productDatabase: ProductSuggestion[] = [
  // Cleansers
  {
    id: "cleanser-1",
    name: "Gentle Foaming Cleanser",
    brand: "CeraVe",
    category: "Cleanser",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    price: "$15.99",
    rating: 4.7,
    forConcerns: ["Acne", "Oiliness", "Large Pores"],
    forSkinTypes: ["oily", "combination", "normal"],
    description: "Non-comedogenic formula with ceramides and niacinamide",
  },
  {
    id: "cleanser-2",
    name: "Hydrating Cream Cleanser",
    brand: "La Roche-Posay",
    category: "Cleanser",
    image: "https://images.unsplash.com/photo-1570194065650-d99fb4b38b9f?w=400&h=400&fit=crop",
    price: "$18.99",
    rating: 4.8,
    forConcerns: ["Dryness", "Redness", "Sensitivity"],
    forSkinTypes: ["dry", "sensitive", "normal"],
    description: "Gentle formula that removes impurities without stripping moisture",
  },
  // Moisturizers
  {
    id: "moisturizer-1",
    name: "Oil-Free Moisturizing Gel",
    brand: "Neutrogena",
    category: "Moisturizer",
    image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop",
    price: "$12.99",
    rating: 4.5,
    forConcerns: ["Oiliness", "Acne", "Large Pores"],
    forSkinTypes: ["oily", "combination"],
    description: "Lightweight gel that hydrates without clogging pores",
  },
  {
    id: "moisturizer-2",
    name: "Intense Hydrating Cream",
    brand: "Drunk Elephant",
    category: "Moisturizer",
    image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&h=400&fit=crop",
    price: "$68.00",
    rating: 4.9,
    forConcerns: ["Dryness", "Wrinkles", "Dullness"],
    forSkinTypes: ["dry", "normal", "combination"],
    description: "Rich cream with hyaluronic acid and peptides for deep hydration",
  },
  // Serums
  {
    id: "serum-1",
    name: "Vitamin C Brightening Serum",
    brand: "Skinceuticals",
    category: "Serum",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop",
    price: "$166.00",
    rating: 4.8,
    forConcerns: ["Dark Spots", "Dullness", "Uneven Texture"],
    forSkinTypes: ["all"],
    description: "Potent antioxidant serum that brightens and protects",
  },
  {
    id: "serum-2",
    name: "Retinol Anti-Aging Serum",
    brand: "The Ordinary",
    category: "Serum",
    image: "https://images.unsplash.com/photo-1617897903246-719242758050?w=400&h=400&fit=crop",
    price: "$9.80",
    rating: 4.6,
    forConcerns: ["Wrinkles", "Dark Spots", "Uneven Texture"],
    forSkinTypes: ["normal", "combination", "oily"],
    description: "Affordable retinol formula for anti-aging benefits",
  },
  {
    id: "serum-3",
    name: "Niacinamide Pore Serum",
    brand: "Paula's Choice",
    category: "Serum",
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop",
    price: "$24.00",
    rating: 4.7,
    forConcerns: ["Large Pores", "Oiliness", "Acne", "Redness"],
    forSkinTypes: ["oily", "combination", "normal"],
    description: "10% niacinamide to minimize pores and control oil",
  },
  // Sunscreen
  {
    id: "sunscreen-1",
    name: "Ultra Light SPF 50",
    brand: "EltaMD",
    category: "Sunscreen",
    image: "https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=400&h=400&fit=crop",
    price: "$39.00",
    rating: 4.9,
    forConcerns: ["Dark Spots", "Wrinkles", "Redness"],
    forSkinTypes: ["all"],
    description: "Broad spectrum protection without white cast",
  },
  // Treatments
  {
    id: "treatment-1",
    name: "Salicylic Acid Spot Treatment",
    brand: "Mario Badescu",
    category: "Treatment",
    image: "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=400&h=400&fit=crop",
    price: "$17.00",
    rating: 4.5,
    forConcerns: ["Acne", "Large Pores", "Oiliness"],
    forSkinTypes: ["oily", "combination"],
    description: "Targeted treatment for blemishes and breakouts",
  },
  {
    id: "treatment-2",
    name: "Hyaluronic Acid Booster",
    brand: "The Inkey List",
    category: "Treatment",
    image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=400&h=400&fit=crop",
    price: "$7.99",
    rating: 4.6,
    forConcerns: ["Dryness", "Dehydration", "Wrinkles"],
    forSkinTypes: ["dry", "normal", "combination"],
    description: "Multi-weight hyaluronic acid for deep hydration",
  },
  // Eye Cream
  {
    id: "eye-1",
    name: "Caffeine Eye Cream",
    brand: "The Ordinary",
    category: "Eye Care",
    image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop",
    price: "$7.20",
    rating: 4.4,
    forConcerns: ["Dark Circles", "Puffiness"],
    forSkinTypes: ["all"],
    description: "Reduces dark circles and puffiness around eyes",
  },
];

interface SkinProfile {
  age?: number;
  gender?: string;
  skin_type?: string;
  primary_concerns?: string[];
  skin_goals?: string[];
  current_routine?: string;
  sun_exposure?: string;
  water_intake?: string;
  sleep_quality?: string;
  stress_level?: string;
  diet_type?: string;
}

interface SkinProductSuggestionsProps {
  skinType: string;
  concerns: SkinConcern[];
  compact?: boolean;
  skinProfile?: SkinProfile | null;
}

export const SkinProductSuggestions = ({ 
  skinType, 
  concerns, 
  compact = false,
  skinProfile 
}: SkinProductSuggestionsProps) => {
  // Match products based on skin type, concerns, and profile data
  const getMatchingProducts = (): ProductSuggestion[] => {
    const concernNames = concerns.map(c => c.name.toLowerCase());
    const normalizedSkinType = skinType.toLowerCase();
    
    // Include profile concerns and goals for better matching
    const profileConcerns = (skinProfile?.primary_concerns || []).map(c => c.toLowerCase());
    const profileGoals = (skinProfile?.skin_goals || []).map(g => g.toLowerCase());
    const allConcerns = [...new Set([...concernNames, ...profileConcerns])];

    // Score each product based on how well it matches
    const scoredProducts = productDatabase.map(product => {
      let score = 0;
      
      // Check skin type match (use profile skin type as fallback)
      const effectiveSkinType = normalizedSkinType || skinProfile?.skin_type?.toLowerCase() || "";
      if (product.forSkinTypes.includes("all") || product.forSkinTypes.includes(effectiveSkinType)) {
        score += 2;
      }
      
      // Check concern matches (from analysis + profile)
      product.forConcerns.forEach(concern => {
        const concernLower = concern.toLowerCase();
        if (allConcerns.some(c => c.includes(concernLower) || concernLower.includes(c))) {
          score += 3;
        }
      });

      // Bonus for matching profile goals
      product.forConcerns.forEach(concern => {
        const concernLower = concern.toLowerCase();
        // Map goals to related concerns
        const goalMappings: Record<string, string[]> = {
          "clearer skin": ["acne", "pores", "oiliness"],
          "anti-aging": ["wrinkles", "dark spots"],
          "even skin tone": ["dark spots", "dullness"],
          "hydration": ["dryness", "dehydration"],
          "reduce oiliness": ["oiliness", "pores", "acne"],
          "minimize pores": ["pores", "oiliness"],
          "brighter complexion": ["dullness", "dark spots"],
          "reduce redness": ["redness", "sensitivity"],
        };
        
        profileGoals.forEach(goal => {
          const relatedConcerns = goalMappings[goal] || [];
          if (relatedConcerns.some(rc => concernLower.includes(rc) || rc.includes(concernLower))) {
            score += 2;
          }
        });
      });

      // Consider age for product recommendations
      if (skinProfile?.age) {
        const age = skinProfile.age;
        if (age >= 30 && product.forConcerns.some(c => c.toLowerCase().includes("wrinkle"))) {
          score += 1;
        }
        if (age < 25 && product.forConcerns.some(c => c.toLowerCase().includes("acne"))) {
          score += 1;
        }
      }

      // Consider sun exposure for sunscreen priority
      if (skinProfile?.sun_exposure === "high" && product.category === "Sunscreen") {
        score += 3;
      }

      // Consider water intake for hydration products
      if (skinProfile?.water_intake === "low" && product.forConcerns.some(c => 
        c.toLowerCase().includes("dry") || c.toLowerCase().includes("hydration")
      )) {
        score += 2;
      }

      return { product, score };
    });

    // Sort by score and return top products
    return scoredProducts
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, compact ? 3 : 6)
      .map(item => item.product);
  };

  const suggestedProducts = getMatchingProducts();

  if (suggestedProducts.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            Recommended Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">{product.price}</p>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">{product.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          Recommended Products for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestedProducts.map((product) => (
            <div
              key={product.id}
              className="group rounded-xl border border-border/50 overflow-hidden bg-card hover:border-primary/30 transition-colors"
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden bg-secondary/30">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <Badge 
                  className="absolute top-2 left-2 text-xs"
                  variant="secondary"
                >
                  {product.category}
                </Badge>
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.brand}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-medium">{product.rating}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {product.description}
                </p>

                {/* Matching Concerns */}
                <div className="flex flex-wrap gap-1">
                  {product.forConcerns.slice(0, 2).map((concern) => (
                    <Badge 
                      key={concern} 
                      variant="outline" 
                      className="text-xs py-0"
                    >
                      {concern}
                    </Badge>
                  ))}
                </div>

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-primary">{product.price}</span>
                  <Button size="sm" variant="secondary" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SkinProductSuggestions;
