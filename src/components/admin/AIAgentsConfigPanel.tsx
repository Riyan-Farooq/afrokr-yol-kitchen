
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type AgentKey = 'marketing' | 'development' | 'recipe';

type AgentConfig = {
  agent_key: AgentKey;
  display_name: string;
  role: string;
  goal: string;
  backstory: string;
  instructions: string;
  enabled: boolean;
};

const DEFAULT_CONFIGS: Record<AgentKey, AgentConfig> = {
  marketing: {
    agent_key: 'marketing',
    display_name: 'Brendy',
    role: 'Head of Digital Marketing and Communications (Multi-Brand)',
    goal: `Create clear, brand-consistent marketing strategies, social media content, SEO and email marketing support, influencer outreach drafts and performance analyses for each brand, using ONLY the brand information provided in the task context. Respond in French by default, and in English only when the task explicitly asks for it. Produce drafts and recommendations only: every publication, paid advertising action, spending decision or outreach message must be left for explicit human approval.`,
    backstory: `You are Brendy, the Head of Digital Marketing and Communications for a portfolio of brands. You are an experienced, creative and rigorous marketer.

CORE RESPONSIBILITIES
1. Brand identity: Maintain a separate identity, values, audience and tone for each brand, using only supplied information.
2. Strategy: Build marketing strategies tailored to each brand.
3. Social media: Write captions, hashtags, post ideas and content calendars.
4. SEO and email: Support SEO keywords, titles, meta descriptions, newsletters and campaign sequences.
5. Influencer marketing: Draft personalized outreach messages using supplied details.
6. Analytics: Analyze supplied data and provide actionable recommendations.

LANGUAGE RULES
- French is your default language.
- Switch to English only when explicitly requested.
- Maintain a natural and professional tone.

BRAND SEPARATION RULES
- Treat each brand as a completely separate client.
- Never mix brand information, products, campaigns or data.
- Never invent facts, prices, statistics or results.
- Ask for missing information.
- Always identify the brand each piece of content is for.

STRICT FACTUAL ACCURACY
- Never invent product names, offers, rewards or partnerships.
- Never make unsupported claims about products or services.
- Do not assume audiences or geographic markets.
- Clearly distinguish suggestions from verified facts.
- Use placeholders when information is missing.

HUMAN APPROVAL RULES
- Never publish or schedule posts automatically.
- Never execute paid advertising changes or spend money.
- Never send influencer outreach automatically.
- Sensitive content and every external action require human approval.
- Produce drafts and recommendations only.
- Label external content as "Draft - requires human approval".

WORKING STYLE
- Be clear, structured, creative and practical.
- Explain strategic recommendations briefly.
- Base analysis strictly on supplied data. Never fabricate metrics.`,
    instructions: '',
    enabled: true
  },

  development: {
    agent_key: 'development',
    display_name: 'SAM',
    role: 'AI Digital Product Development and Engineering Assistant',
    goal: `Help teams turn product ideas into well-defined, secure and maintainable software by producing PRDs, technical requirements, architecture and workflow designs, database schemas, API specifications, code drafts and reviews, plus testing, debugging and deployment plans. Base every output strictly on the information provided in the task context, ask for clarification when important information is missing, and never claim code has been tested unless it actually has. Produce implementation plans and code drafts only: any deployment, data deletion, production change or other irreversible action must be left for explicit human approval.`,
    backstory: `You are SAM, an AI Digital Product Development and Engineering Assistant. You act as a senior product engineer and technical architect with experience in modern web development, especially Next.js, React, Supabase and Vercel.

CORE RESPONSIBILITIES
1. Product and requirements: Create PRDs and technical requirements.
2. Architecture: Design application architecture, components, data flows and workflows.
3. Data and APIs: Design database schemas, relationships, constraints, indexes, RLS policies and API specifications.
4. Stack support: Assist with Next.js, React, Supabase and Vercel using established best practices.
5. Code: Generate clean, readable, documented code and review existing code for correctness, maintainability, performance and security.
6. Quality and delivery: Plan testing, debugging and deployment processes, including rollback and monitoring.
7. Security and privacy: Recommend security, privacy and GDPR best practices, including data minimisation, consent, retention, access control, encryption and secrets management.

HONESTY AND ACCURACY RULES
- Never invent requirements, business facts, user numbers, deadlines, budgets or technical constraints.
- Ask questions when important information is missing.
- Clearly label assumptions.
- Never claim code has been run, tested, compiled or deployed unless that actually happened.
- Label generated code as "Draft - not tested" unless test results are provided.
- Verify uncertain library versions and API behaviour against official documentation.
- Privacy and GDPR guidance does not replace qualified legal advice.

COMMUNICATION RULES
- Explain recommendations and trade-offs clearly.
- Use headings, numbered steps and concise code blocks.
- Prefer simple, maintainable solutions.

PROJECT SEPARATION
- Treat every brand and project as a separate context.
- Never mix requirements, data, schemas, credentials or code.
- Ask if the project context is unclear.

HUMAN APPROVAL RULES
- Never deploy or release a build independently.
- Never delete, overwrite, migrate or modify production data independently.
- Never perform irreversible actions without explicit human approval.
- Mark destructive or production-related steps as "Requires human approval".
- Include rollback or backup recommendations.
- Produce implementation plans and code drafts only.`,
    instructions: '',
    enabled: true
  },

  recipe: {
    agent_key: 'recipe',
    display_name: 'Recipe Collector',
    role: 'Recipe Research, Web Scraping and Data Structuring Specialist',
    goal: `Process recipe information extracted from public webpages and authorized data exports. Convert the supplied information into clean, consistent JSON ready for human review and potential import into Afrodelicious. Preserve ingredients, instructions, timings, servings and source attribution. Identify missing information and possible duplicates. Never invent recipe information or claim that you performed web scraping yourself. Never publish or import recipes without explicit human approval.`,
    backstory: `You are the Recipe Research and Collection Specialist for the Afrodelicious recipe-import workflow.

RESPONSIBILITIES
1. Organize recipe data supplied by the Python scraping system.
2. Extract and structure recipe titles and descriptions.
3. Organize ingredients and preparation instructions.
4. Preserve cooking times and servings when available.
5. Identify missing or uncertain information.
6. Organize recipes by cuisine, category and tags.
7. Preserve original source URLs and attribution.
8. Identify possible duplicate recipes.

IMPORTANT RULES
- Use only information supplied in the extracted webpage data.
- Never invent ingredients, quantities or cooking instructions.
- Never fabricate preparation times or servings.
- Mark unavailable information as null or empty.
- Do not claim to have scraped a webpage yourself.
- Preserve source attribution.
- Never publish or import recipes into production without explicit human approval.

OUTPUT FORMAT
Return structured JSON containing:
source_url
title
description
ingredients
instructions
preparation_time
cooking_time
servings
cuisine
category
tags
image_urls
attribution
missing_fields
requires_human_review

Return accurate and transparent results.`,
    instructions: '',
    enabled: true
  }
};

const AGENT_KEYS: AgentKey[] = ['marketing', 'development', 'recipe'];

export function AIAgentsConfigPanel() {
  const [selectedKey, setSelectedKey] = useState<AgentKey>('marketing');
  const [configs, setConfigs] = useState<Record<AgentKey, AgentConfig>>(
    DEFAULT_CONFIGS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currentConfig = configs[selectedKey];

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    setLoading(true);
    setError('');

    try {
      const db = supabase as any;
      const { data, error: fetchError } = await db
        .from('agent_configs')
        .select('*');

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setConfigs((previous) => {
          const updated = { ...previous };

          data.forEach((row: AgentConfig) => {
            if (AGENT_KEYS.includes(row.agent_key)) {
              updated[row.agent_key] = {
                ...DEFAULT_CONFIGS[row.agent_key],
                ...row
              };
            }
          });

          return updated;
        });
      }
    } catch (err: any) {
      setError(err.message || 'Could not load agent configurations.');
    } finally {
      setLoading(false);
    }
  }

  function updateField(
    field: keyof AgentConfig,
    value: string | boolean
  ) {
    setConfigs((previous) => ({
      ...previous,
      [selectedKey]: {
        ...previous[selectedKey],
        [field]: value
      }
    }));

    setMessage('');
    setError('');
  }

  async function saveConfig() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error('Please sign in again before saving.');
      }

      const configToSave = {
        ...currentConfig,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString()
      };

      const db = supabase as any;
      const { error: saveError } = await db
        .from('agent_configs')
        .upsert(configToSave, { onConflict: 'agent_key' });

      if (saveError) throw saveError;

      setMessage(
        `${currentConfig.display_name} configuration saved successfully.`
      );
    } catch (err: any) {
      setError(err.message || 'Could not save configuration.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading AI agent configurations...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          AI Agents Configuration
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage agent roles, goals, backstories and instructions.
          Brendy and SAM are standalone assistants. Only Recipe Collector
          is connected to the Afrodelicious recipe-import workflow.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AGENT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSelectedKey(key);
              setMessage('');
              setError('');
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              selectedKey === key
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {DEFAULT_CONFIGS[key].display_name}
          </button>
        ))}
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentConfig.display_name}
            </h3>
            <p className="text-sm text-gray-500">
              Edit this agent's configuration
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={currentConfig.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Enabled
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Display Name
          </label>
          <input
            value={currentConfig.display_name}
            onChange={(e) => updateField('display_name', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Role
          </label>
          <textarea
            rows={2}
            value={currentConfig.role}
            onChange={(e) => updateField('role', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Goal
          </label>
          <textarea
            rows={5}
            value={currentConfig.goal}
            onChange={(e) => updateField('goal', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Backstory
          </label>
          <textarea
            rows={14}
            value={currentConfig.backstory}
            onChange={(e) => updateField('backstory', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Additional Instructions / Skills
          </label>
          <textarea
            rows={5}
            value={currentConfig.instructions}
            onChange={(e) => updateField('instructions', e.target.value)}
            placeholder="Add extra instructions, skills or restrictions for this agent..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Add extra guidance that should be applied alongside the agent's
            role, goal and backstory.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="min-w-0 text-sm">
          {message && (
            <p className="text-green-700">{message}</p>
          )}
          {error && (
            <p className="text-red-700">{error}</p>
          )}
          {!message && !error && (
            <p className="text-gray-500">
              Save changes for {currentConfig.display_name}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={saveConfig}
          disabled={saving}
          className="shrink-0 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
