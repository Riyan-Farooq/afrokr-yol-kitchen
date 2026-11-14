
import React, { useState } from 'react';
import {
  X,
  Link2,
  Sparkles,
  CheckCircle2,
  Loader2,
  Globe,
  AlertCircle,
} from 'lucide-react';
import type { Recipe, User, Ingredient, RecipeStep } from '../types';
import { getCountryFlag } from '../utils/countryFlags';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRecipeImported: (recipe: Recipe) => void;
}

interface CollectorResult {
  source_url?: string;
  title?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  preparation_time?: string | number | null;
  cooking_time?: string | number | null;
  servings?: string | number | null;
  cuisine?: string | null;
  category?: string | null;
  image_urls?: string[];
  attribution?: string;
  missing_fields?: string[];
  requires_human_review?: boolean;
}

interface AgentApiResponse {
  success: boolean;
  result: string;
  detail?: string;
}

const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&auto=format&fit=crop&q=80';

const AISLES: Ingredient['aisle'][] = [
  'Marché Frais & Légumes',
  'Boucherie & Poissons',
  'Épicerie & Épices Afro',
  'Féculents & Racines',
  'Condiments & Huiles',
  'Rayon Frais',
];

const CATEGORIES: Recipe['category'][] = [
  'Plats Traditionnels',
  'Street Food',
  'Desserts & Douceurs',
  'Sauces & Marinades',
  'Boissons & Cocktails',
  'Végétarien & Vegan',
];

function parseAgentResult(result: string): CollectorResult {
  const cleaned = result
    .replace(/```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Le backend n’a pas retourné un JSON valide.');
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function parseDuration(value?: string | number | null): number {
  if (typeof value === 'number') {
    return Math.max(0, Math.round(value));
  }

  if (!value) return 0;

  const text = String(value).trim();

  // ISO 8601 durations, for example PT10M or PT1H20M.
  const iso = text.match(
    /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?$/i
  );

  if (iso) {
    return Math.round(
      Number(iso[1] || 0) * 60 + Number(iso[2] || 0)
    );
  }

  const number = text.match(/\d+(?:[.,]\d+)?/);
  return number ? Math.round(Number(number[0].replace(',', '.'))) : 0;
}

function parseServings(value?: string | number | null): number {
  if (value === null || value === undefined) return 4;

  const match = String(value).match(/\d+/);
  if (!match) return 4;

  return Math.min(100, Math.max(1, Number(match[0])));
}

function getAisle(name: string): Ingredient['aisle'] {
  const value = name.toLowerCase();

  if (/chicken|poulet|fish|poisson|beef|boeuf|meat|morue|shrimp|crevette/.test(value)) {
    return 'Boucherie & Poissons';
  }

  if (/milk|lait|cream|crème|butter|beurre|cheese|fromage|egg|œuf|yogurt/.test(value)) {
    return 'Rayon Frais';
  }

  if (/oil|huile|vinegar|vinaigre/.test(value)) {
    return 'Condiments & Huiles';
  }

  if (/flour|farine|rice|riz|plantain|plantain|potato|pomme de terre|pasta|pâtes/.test(value)) {
    return 'Féculents & Racines';
  }

  if (/tomato|tomate|onion|oignon|carrot|carotte|pepper|poivron|garlic|ail|lemon|citron/.test(value)) {
    return 'Marché Frais & Légumes';
  }

  return 'Épicerie & Épices Afro';
}

function parseIngredient(raw: string, index: number): Ingredient {
  const value = raw.trim();

  const match = value.match(
    /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(.*)$/
  );

  let amount = 0;
  let remainder = value;

  if (match) {
    if (match[1].includes('/')) {
      const [numerator, denominator] = match[1].split('/');
      amount = Number(numerator) / Number(denominator);
    } else {
      amount = Number(match[1].replace(',', '.'));
    }

    remainder = match[2].trim();
  }

  const unitMatch = remainder.match(
    /^(kg|g|mg|ml|cl|l|tbsp|tsp|cup|cups|oz|lb|tablespoons?|teaspoons?|grams?|kilograms?|milliliters?|liters?|pieces?|pièces?)\b\s*/i
  );

  const unit = unitMatch ? unitMatch[1] : '';
  const name = unitMatch
    ? remainder.slice(unitMatch[0].length).trim()
    : remainder;

  return {
    id: `import-${index + 1}`,
    name: name || value,
    amount,
    unit,
    aisle: getAisle(name || value),
  };
}

function mapCategory(value?: string | null): Recipe['category'] {
  if (!value) return 'Plats Traditionnels';

  const normalized = value.toLowerCase();

  return (
    CATEGORIES.find(category =>
      category.toLowerCase() === normalized
    ) || 'Plats Traditionnels'
  );
}

function mapRecipe(
  data: CollectorResult,
  currentUser: User
): Recipe {
  const ingredients = (data.ingredients || [])
    .filter(item => typeof item === 'string' && item.trim())
    .map(parseIngredient);

  const steps: RecipeStep[] = (data.instructions || [])
    .filter(item => typeof item === 'string' && item.trim())
    .map((instruction, index) => ({
      stepNumber: index + 1,
      title: `Étape ${index + 1}`,
      instruction: instruction.trim(),
    }));

  if (!data.title?.trim()) {
    throw new Error('Le titre de la recette est absent.');
  }

  if (ingredients.length === 0 || steps.length === 0) {
    throw new Error(
      'Les ingrédients ou les instructions sont absents. Cette recette nécessite une vérification manuelle.'
    );
  }

  const source = data.source_url || '';
  const attribution = data.attribution || 'Source web';

  return {
    id: `imported-${Date.now()}`,
    title: data.title.trim(),
    description: data.description || '',
    authorId: currentUser.id,
    authorName: currentUser.name,
    authorAvatar: currentUser.avatar,
    authorHandle:
      currentUser.handle ||
      `@${currentUser.name.toLowerCase().replace(/\s+/g, '_')}`,
    authorRole: currentUser.role,

    // The scraper does not currently establish the recipe's country.
    country: data.cuisine || '',
    countryFlag: data.cuisine ? getCountryFlag(data.cuisine) : '🌍',

    category: mapCategory(data.category),
    difficulty: 'Moyen',
    prepTimeMinutes: parseDuration(data.preparation_time),
    cookTimeMinutes: parseDuration(data.cooking_time),
    servings: parseServings(data.servings),

    imageUrl: data.image_urls?.[0] || FALLBACK_IMAGE,

    heritageStory: [
      `Source: ${source}`,
      `Attribution: ${attribution}`,
    ].filter(Boolean).join('\n'),

    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    isLiked: false,
    isBookmarked: false,

    ingredients,
    steps,
    comments: [],
    createdAt: new Date().toISOString(),
    isPublished: false,
  };
}

export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRecipeImported,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] =
    useState<Recipe | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleExtraction = async () => {
    const url = inputUrl.trim();

    if (!url) return;

    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Veuillez saisir une URL HTTP ou HTTPS valide.');
      }
    } catch {
      setError('Veuillez saisir une URL valide.');
      return;
    }

    setIsExtracting(true);
    setExtractedData(null);
    setMissingFields([]);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_type: 'recipe',
          user_request:
            'Process the scraped recipe and return structured JSON. Preserve source information. Do not invent missing information. Require human review.',
          recipe_url: url,
        }),
      });

      const apiData: AgentApiResponse = await response.json();

      if (!response.ok || !apiData.success) {
        throw new Error(
          apiData.detail || 'La récupération de la recette a échoué.'
        );
      }

      const collectorData = parseAgentResult(apiData.result);

      const recipe = mapRecipe(collectorData, currentUser);

      setExtractedData(recipe);
      setMissingFields(collectorData.missing_fields || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur inattendue est survenue.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!extractedData) return;

    onRecipeImported({
      ...extractedData,
      isPublished: false,
    });

    setInputUrl('');
    setExtractedData(null);
    setMissingFields([]);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center-safe justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">

        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-[#0F3E2E]">
              <Link2 className="w-5 h-5" />
            </div>

            <div>
              <h2 className="font-serif font-black text-xl text-slate-900">
                Importer depuis un lien
              </h2>
              <p className="text-xs text-slate-500">
                Extraction de recettes depuis des pages web compatibles
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          <div className="flex items-center gap-2 text-xs text-slate-500 pb-3 border-b border-slate-200">
            <Globe className="w-4 h-4 text-[#0F3E2E]" />
            <span>
              Pages web contenant des données structurées de recettes (Schema.org)
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              Collez l'URL de la recette
            </label>

            <div className="flex gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleExtraction();
                }}
                placeholder="https://www.example.com/recipe..."
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#0F3E2E] focus:outline-none"
              />

              <button
                type="button"
                disabled={isExtracting || !inputUrl.trim()}
                onClick={handleExtraction}
                className="px-4 py-2.5 rounded-xl bg-[#0F3E2E] text-white text-xs font-bold hover:bg-[#15523E] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extraction...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extraire</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {extractedData && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3 animate-in fade-in duration-300">

              <div className="flex items-center gap-2 text-xs font-bold text-[#0F3E2E]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recette extraite avec succès</span>
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={extractedData.imageUrl}
                  alt={extractedData.title}
                  onError={e => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                  className="w-20 h-20 rounded-xl object-cover border border-white shadow-xs shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500">
                    {extractedData.prepTimeMinutes} min préparation
                    {' · '}
                    {extractedData.cookTimeMinutes} min cuisson
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">
                    {extractedData.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {extractedData.description}
                  </p>

                  <p className="text-[11px] text-[#0F3E2E] font-semibold mt-1">
                    {extractedData.ingredients.length} ingrédients
                    {' · '}
                    {extractedData.steps.length} étapes
                    {' · '}
                    {extractedData.servings} portions
                  </p>
                </div>
              </div>

              {missingFields.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <strong>Informations à vérifier :</strong>
                  <p className="mt-1">
                    {missingFields.join(', ')}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/70 text-xs text-slate-600">
                <strong>Vérification administrative requise.</strong>
                {' '}
                Cette recette sera enregistrée comme brouillon et ne sera pas publiée automatiquement.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-emerald-100">
                <button
                  type="button"
                  onClick={() => setExtractedData(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-white"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 rounded-xl bg-[#0F3E2E] hover:bg-[#15523E] text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enregistrer comme brouillon</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
