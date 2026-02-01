import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { supabase } from "../../lib/supabase";
import { Octokit } from "octokit";

interface UserSettings {
  openrouter_key: string;
  github_token: string;
  github_owner: string;
  github_repo: string;
}

export default function Generator({ session }: { session: any }) {
  const user = session.user;
  const [settings, setSettings] = useState<UserSettings>({
    openrouter_key: "",
    github_token: "",
    github_owner: "hugogresse", // Default or fetch
    github_repo: "recettes", // Default or fetch
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedSlug, setGeneratedSlug] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"generate" | "settings">(
    "generate",
  );

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const sessionGithubToken =
        session.provider_token &&
        session.user.app_metadata.provider === "github"
          ? session.provider_token
          : "";

      if (data) {
        setSettings({
          openrouter_key: data.openrouter_key || "",
          github_token: data.github_token || sessionGithubToken || "",
          github_owner: data.github_owner || "hugogresse",
          github_repo: data.github_repo || "recettes",
        });
      } else if (sessionGithubToken) {
        setSettings((s) => ({ ...s, github_token: sessionGithubToken }));
      }
      setLoadingSettings(false);
    }
    loadSettings();
  }, [user.id, session.provider_token]);

  const saveSettings = async (e: Event) => {
    e.preventDefault();
    setLoadingSettings(true);
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      ...settings,
    });

    if (error) setMessage(`Error saving settings: ${error.message}`);
    else {
      setMessage("Settings saved!");
      setActiveTab("generate");
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

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.openrouter_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-5.2", // Cheap/Free model
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
        },
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const content = data.choices[0].message.content;
      setGeneratedContent(content);

      // Extract title for filename
      const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
      if (titleMatch) {
        const title = titleMatch[1];
        setGeneratedTitle(title);
        // Create simple slug
        setGeneratedSlug(
          title
            .toLowerCase()
            .replace(/[àâä]/g, "a")
            .replace(/[éèêë]/g, "e")
            .replace(/[îï]/g, "i")
            .replace(/[ôö]/g, "o")
            .replace(/[ùûü]/g, "u")
            .replace(/[ç]/g, "c")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
        );
      }
    } catch (error: any) {
      setMessage(`Generation failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const publishToGithub = async () => {
    const token = settings.github_token;

    if (!token) {
      setMessage(
        "Please save your GitHub Token first in Settings or login with GitHub.",
      );
      setActiveTab("settings");
      return;
    }

    setGenerating(true); // Re-use loading state
    setMessage("Publishing to GitHub...");

    try {
      const octokit = new Octokit({ auth: token });
      const path = `src/content/recipes/${generatedSlug}.md`; // Put in root or organize by folders? Putting in root of recipes for simplicity or sweet/savory if detected.
      // For now, let's put it in a 'generated' folder or just root 'src/content/recipes' if supported.
      // The current setup has 'sweet' folder. Let's ask user or just put in 'generated'.
      // Actually, let's just put it in 'sweet' for now or try to detect.
      // Simpler: src/content/recipes/generated/${slug}.md

      const filePath = `src/content/recipes/${generatedSlug}.md`;
      const contentEncoded = btoa(
        unescape(encodeURIComponent(generatedContent)),
      ); // Handle UTF-8

      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: settings.github_owner,
        repo: settings.github_repo,
        path: filePath,
        message: `feat: add recipe ${generatedTitle}`,
        content: contentEncoded,
      });

      setMessage(
        `Success! Recipe published to ${filePath}. It will appear after the next build.`,
      );
    } catch (error: any) {
      setMessage(`GitHub Publish failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

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
              onInput={(e) =>
                setSettings({
                  ...settings,
                  openrouter_key: e.currentTarget.value,
                })
              }
              class="input-field"
              placeholder="sk-or-..."
            />
          </div>
          <div class="form-group">
            <label>GitHub Personal Access Token (Repo scope)</label>
            <input
              type="password"
              value={settings.github_token}
              onInput={(e) =>
                setSettings({
                  ...settings,
                  github_token: e.currentTarget.value,
                })
              }
              class="input-field"
              placeholder="ghp_..."
            />
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label>GitHub Owner</label>
              <input
                value={settings.github_owner}
                onInput={(e) =>
                  setSettings({
                    ...settings,
                    github_owner: e.currentTarget.value,
                  })
                }
                class="input-field"
              />
            </div>
            <div class="form-group">
              <label>GitHub Repo</label>
              <input
                value={settings.github_repo}
                onInput={(e) =>
                  setSettings({
                    ...settings,
                    github_repo: e.currentTarget.value,
                  })
                }
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
                <button
                  onClick={publishToGithub}
                  disabled={generating}
                  class="btn-success"
                >
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
        .btn-success {
          background: var(--color-accent);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          font-weight: 600;
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
