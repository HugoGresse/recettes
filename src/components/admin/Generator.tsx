import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Octokit } from "octokit";

interface UserSettings {
  openrouter_key: string;
  github_token: string;
  github_owner: string;
  github_repo: string;
  selected_model: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
}

const DEFAULT_MODEL = "openai/gpt-5.2";

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[àâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Generator({ session }: { session: any }) {
  const user = session.user;
  const [settings, setSettings] = useState<UserSettings>({
    openrouter_key: "",
    github_token: "",
    github_owner: "hugogresse",
    github_repo: "recettes",
    selected_model: DEFAULT_MODEL,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelFilter, setModelFilter] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedSlug, setGeneratedSlug] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"generate" | "settings">("generate");

  useEffect(() => {
    async function loadSettings() {
      const snap = await getDoc(doc(db, "user_settings", user.uid));
      const data = snap.exists() ? snap.data() : null;
      if (data) {
        setSettings({
          openrouter_key: data.openrouter_key || "",
          github_token: data.github_token || "",
          github_owner: data.github_owner || "hugogresse",
          github_repo: data.github_repo || "recettes",
          selected_model: data.selected_model || DEFAULT_MODEL,
        });
      }
      setLoadingSettings(false);
    }
    loadSettings();
  }, [user.uid]);

  useEffect(() => {
    if (!settings.openrouter_key) return;
    setLoadingModels(true);
    fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${settings.openrouter_key}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list: OpenRouterModel[] = (data.data || [])
          .map((m: any) => ({ id: m.id, name: m.name || m.id }))
          .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));
        setModels(list);
      })
      .catch(() => {})
      .finally(() => setLoadingModels(false));
  }, [settings.openrouter_key]);

  const saveSettings = async (e: Event) => {
    e.preventDefault();
    setLoadingSettings(true);
    try {
      await setDoc(doc(db, "user_settings", user.uid), settings, { merge: true });
      setMessage("Settings saved!");
      setActiveTab("generate");
    } catch (error: any) {
      setMessage(`Error saving settings: ${error.message}`);
    }
    setLoadingSettings(false);
  };

  const generateRecipe = async () => {
    if (!settings.openrouter_key) {
      setMessage("Please save your OpenRouter API Key first in Settings.");
      setActiveTab("settings");
      return;
    }

    setGenerating(true);
    setMessage("");
    setGeneratedContent("");
    setGeneratedTitle("");
    setGeneratedSlug("");

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.openrouter_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: settings.selected_model,
          stream: true,
          messages: [
            {
              role: "system",
              content: `Tu es une aide a la cuisine. Tu me donnes le recettes de cuisine avec un duplicata des quantités directement dans les instructions. Tu me dis aussi les points a faire attention pour bien réussir la recette. Generate a recipe in Markdown format compatible with Astro content collections.
Frontmatter (YAML) is REQUIRED:
---
title: "Recipe Title"
description: "Short description"
prep_time: "15 min"
cook_time: "30 min"
servings: 4
difficulty: "Easy/Medium/Hard"
---

Followed by the recipe content in French. Use ## for sections (Ingrédients, Instructions).`,
            },
            { role: "user", content: `Create a recipe for: ${prompt}` },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || response.statusText);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullContent += delta;
              setGeneratedContent(fullContent);
            }
          } catch {}
        }
      }

      const titleMatch = fullContent.match(/title:\s*["']?([^"'\n]+)["']?/);
      if (titleMatch) {
        const title = titleMatch[1];
        setGeneratedTitle(title);
        setGeneratedSlug(toSlug(title));
      }
    } catch (error: any) {
      setMessage(`Generation failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const publishToGithub = async () => {
    if (!settings.github_token) {
      setMessage("Please save your GitHub Token first in Settings.");
      setActiveTab("settings");
      return;
    }

    setGenerating(true);
    setMessage("Publishing to GitHub...");

    try {
      const octokit = new Octokit({ auth: settings.github_token });
      const filePath = `src/content/recipes/${generatedSlug}.md`;
      const bytes = new TextEncoder().encode(generatedContent);
      const contentEncoded = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));

      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: settings.github_owner,
        repo: settings.github_repo,
        path: filePath,
        message: `feat: add recipe ${generatedTitle}`,
        content: contentEncoded,
      });

      setMessage(`Success! Recipe published to ${filePath}. It will appear after the next build.`);
    } catch (error: any) {
      setMessage(`GitHub Publish failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const filteredModels = modelFilter
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(modelFilter.toLowerCase()) ||
          m.id.toLowerCase().includes(modelFilter.toLowerCase()),
      )
    : models;

  if (loadingSettings) return <div>Loading user settings...</div>;

  return (
    <div class="generator-container">
      <div class="tabs">
        <button
          class={`tab-btn ${activeTab === "generate" ? "active" : ""}`}
          onClick={() => setActiveTab("generate")}
        >
          Generator
        </button>
        <button
          class={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {activeTab === "settings" && (
        <form onSubmit={saveSettings} class="settings-form">
          <h3>API Keys</h3>
          <div class="form-group">
            <label>OpenRouter API Key</label>
            <input
              type="password"
              value={settings.openrouter_key}
              onInput={(e) => setSettings({ ...settings, openrouter_key: e.currentTarget.value })}
              class="input-field"
              placeholder="sk-or-..."
            />
          </div>
          <div class="form-group">
            <label>GitHub Personal Access Token (Repo scope)</label>
            <input
              type="password"
              value={settings.github_token}
              onInput={(e) => setSettings({ ...settings, github_token: e.currentTarget.value })}
              class="input-field"
              placeholder="ghp_..."
            />
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label>GitHub Owner</label>
              <input
                value={settings.github_owner}
                onInput={(e) => setSettings({ ...settings, github_owner: e.currentTarget.value })}
                class="input-field"
              />
            </div>
            <div class="form-group">
              <label>GitHub Repo</label>
              <input
                value={settings.github_repo}
                onInput={(e) => setSettings({ ...settings, github_repo: e.currentTarget.value })}
                class="input-field"
              />
            </div>
          </div>
          <button type="submit" class="btn-primary">
            Save Settings
          </button>
        </form>
      )}

      {activeTab === "generate" && (
        <div class="generate-view">
          <div class="model-selector">
            <div class="model-header">
              <label>Model</label>
              {loadingModels && <span class="loading-badge">Loading models...</span>}
            </div>
            {models.length > 0 ? (
              <>
                <input
                  type="text"
                  placeholder="Filter models..."
                  value={modelFilter}
                  onInput={(e) => setModelFilter(e.currentTarget.value)}
                  class="input-field model-filter"
                />
                <select
                  value={settings.selected_model}
                  onChange={(e) =>
                    setSettings({ ...settings, selected_model: e.currentTarget.value })
                  }
                  class="input-field"
                >
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <input
                type="text"
                value={settings.selected_model}
                onInput={(e) =>
                  setSettings({ ...settings, selected_model: e.currentTarget.value })
                }
                class="input-field"
                placeholder={DEFAULT_MODEL}
              />
            )}
          </div>

          <div class="prompt-box">
            <textarea
              value={prompt}
              onInput={(e) => setPrompt(e.currentTarget.value)}
              placeholder="Describe the recipe you want (e.g. 'Gluten-free chocolate cake with chestnuts')"
              class="textarea-field"
              rows={3}
            />
            <button
              onClick={generateRecipe}
              disabled={generating || !prompt}
              class="btn-primary"
            >
              {generating ? "Generating..." : "Generate Recipe"}
            </button>
          </div>

          {generatedContent && (
            <div class="preview-section">
              <h3>Preview</h3>
              <div class="preview-actions">
                <input
                  value={generatedSlug}
                  onInput={(e) => setGeneratedSlug(e.currentTarget.value)}
                  class="input-field small"
                  title="Filename slug"
                />
                <button onClick={publishToGithub} disabled={generating} class="btn-success">
                  Publish to GitHub
                </button>
              </div>
              <pre class="code-preview">{generatedContent}</pre>
            </div>
          )}
        </div>
      )}

      {message && <div class="message-banner">{message}</div>}

      <style>{`
        .generator-container {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface-elevated);
        }
        .tab-btn {
          padding: 1rem 2rem;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: var(--color-text-secondary);
          border-bottom: 2px solid transparent;
        }
        .tab-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
          background: var(--color-surface);
        }
        .settings-form, .generate-view {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group-row {
          display: flex;
          gap: 1rem;
        }
        .form-group-row .form-group {
          flex: 1;
        }
        .model-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .model-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .loading-badge {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        .model-filter {
          font-size: 0.875rem;
        }
        .input-field, .textarea-field {
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
          font-family: inherit;
        }
        .btn-primary {
          background: var(--color-primary);
          color: white;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          font-weight: 600;
          align-self: flex-start;
        }
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .btn-success {
          background: var(--color-accent);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-success:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .code-preview {
          background: var(--color-surface-elevated);
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          overflow-x: auto;
          white-space: pre-wrap;
          font-family: var(--font-family-mono);
          font-size: 0.85rem;
        }
        .message-banner {
          padding: 1rem;
          background: var(--color-surface-hover);
          text-align: center;
          border-top: 1px solid var(--color-border);
        }
        .preview-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
