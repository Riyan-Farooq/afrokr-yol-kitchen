
import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  Code,
  ChefHat,
  Link
} from 'lucide-react';

type AgentType = 'marketing' | 'development' | 'recipe';

const API_URL = 'http://127.0.0.1:8000';

const agents = [
  {
    id: 'marketing' as AgentType,
    name: 'Brendy',
    description: 'Marketing & Communications',
    icon: Sparkles,
    color: 'bg-pink-100 text-pink-600',
    placeholder: 'Ask Brendy to create a marketing strategy, social media caption, SEO ideas or an email draft...'
  },
  {
    id: 'development' as AgentType,
    name: 'SAM',
    description: 'Digital Product Development',
    icon: Code,
    color: 'bg-blue-100 text-blue-600',
    placeholder: 'Ask SAM to prepare a PRD, technical requirements, software architecture or development plan...'
  },
  {
    id: 'recipe' as AgentType,
    name: 'Recipe Collector',
    description: 'Recipe Extraction & Structuring',
    icon: ChefHat,
    color: 'bg-orange-100 text-orange-600',
    placeholder: 'Tell Recipe Collector what recipe information you need from the webpage...'
  }
];

export function AIAssistantView() {
  const [selectedAgent, setSelectedAgent] =
    useState<AgentType>('marketing');

  const [prompt, setPrompt] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentAgent = agents.find(
    (agent) => agent.id === selectedAgent
  )!;

  const handleAgentChange = (agent: AgentType) => {
    setSelectedAgent(agent);
    setResult('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!prompt.trim()) {
      setError('Please enter a request first.');
      return;
    }

    if (selectedAgent === 'recipe' && !recipeUrl.trim()) {
      setError('Please enter a recipe webpage URL.');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_type: selectedAgent,
          user_request: prompt,
          ...(selectedAgent === 'recipe' && {
            recipe_url: recipeUrl
          })
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'The AI assistant could not process your request.'
        );
      }

      setResult(
        typeof data.result === 'string'
          ? data.result
          : JSON.stringify(data.result, null, 2)
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the AI backend. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-purple-100 p-3 text-purple-600">
              <Sparkles size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Afrodelicious AI Assistant
              </h1>
              <p className="text-sm text-gray-500">
                Your intelligent team for marketing, development and recipes.
              </p>
            </div>
          </div>
        </div>

        {/* Agent Selection */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isSelected = selectedAgent === agent.id;

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => handleAgentChange(agent.id)}
                className={`rounded-2xl border-2 p-5 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-purple-500 bg-white shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-200'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className={`rounded-xl p-3 ${agent.color}`}>
                    <Icon size={23} />
                  </div>

                  {isSelected && (
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      Selected
                    </span>
                  )}
                </div>

                <h2 className="font-bold text-gray-900">
                  {agent.name}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {agent.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Request Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">

          <div className="mb-5 flex items-center gap-3">
            <div className={`rounded-xl p-3 ${currentAgent.color}`}>
              <currentAgent.icon size={22} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Chat with {currentAgent.name}
              </h2>
              <p className="text-sm text-gray-500">
                {currentAgent.description}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            {selectedAgent === 'recipe' && (
              <div className="mb-4">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Link size={16} />
                  Recipe webpage URL
                </label>

                <input
                  type="url"
                  value={recipeUrl}
                  onChange={(event) => setRecipeUrl(event.target.value)}
                  placeholder="https://example.com/recipe"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  required
                />
              </div>
            )}

            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Your request
            </label>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={currentAgent.placeholder}
              rows={5}
              className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              required
            />

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Request
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* AI Response */}
        {result && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
                <Bot size={22} />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  {currentAgent.name}'s Response
                </h2>
                <p className="text-xs text-gray-500">
                  AI-generated response
                </p>
              </div>
            </div>

            <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
              {result}
            </div>

            <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-500">
              Please review AI-generated content before using or publishing it.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
