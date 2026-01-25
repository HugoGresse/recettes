# Supabase Setup Guide

## 1. Create Supabase Project
1. Go to [database.new](https://database.new) and create a new project.
2. Once ready, go to **Settings > API**.
3. You will see two keys:
   - **Project URL**
   - **anon** / **public** (This is the one we want!)
   - **service_role** / **secret** (DO NOT USE THIS ONE)

## 2. Configure Environment Variables
Create a `.env` file in the root of your project:

```bash
PUBLIC_SUPABASE_URL=your_project_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

*Important: Never use the `service_role` (secret) key in a frontend application.*

## 3. Create Database Table
Go to the **SQL Editor** in Supabase and run this script to create the table for storing your settings.

```sql
-- 1. Create the table
create table user_settings (
  user_id uuid references auth.users not null primary key,
  openrouter_key text,
  github_token text,
  github_owner text,
  github_repo text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Security (RLS)
alter table user_settings enable row level security;

-- 3. Create Access Policies
create policy "Users can view their own settings"
  on user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own settings"
  on user_settings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own settings"
  on user_settings for update
  using ( auth.uid() = user_id );
```

## 4. Setup Authentication
1. Go to **Authentication > Providers**.
2. Enable **Email/Password**.
3. (Optional) Disable "Confirm email" in Authentication > URL Configuration if you want to test quickly.

## 5. Setup OAuth Providers (Google & GitHub)

### GitHub Login
1. Create a GitHub OAuth App in GitHub Developer Settings.
   - Homepage URL: Your site URL (e.g. `http://localhost:4321` or `https://hugogresse.github.io/recettes`)
   - Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Go to **Authentication > Providers** in Supabase.
3. Enable **GitHub**.
4. Enter your **Client ID** and **Client Secret**.

### Google Login
1. Create a project in Google Cloud Console.
2. Set up OAuth consent screen.
3. Create OAuth 2.0 Client credentials.
   - Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Go to **Authentication > Providers** in Supabase.
5. Enable **Google**.
6. Enter your **Client ID** and **Client Secret**.

## 6. Configure Redirect URLs (Crucial for Production)
For the login to work on GitHub Pages, you must whitelist the URL in Supabase.

1. Go to **Authentication > URL Configuration**.
2. Under **Redirect URLs**, add your production URL.
   - Example: `https://hugogresse.github.io/recettes/admin`
   - Or allow all subpaths: `https://hugogresse.github.io/recettes/**`
3. Ensure your **Site URL** is set correctly (e.g. `http://localhost:4321` for dev, or your production URL).

## 7. Deployment
When deploying to GitHub Pages, add these secrets to your repository (Settings > Secrets and variables > Actions):
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
