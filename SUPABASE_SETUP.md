# Supabase Setup Guide

Since you chose "Guide me", here are the steps to set up the backend for your Admin Panel.

## 1. Create Supabase Project
1. Go to [database.new](https://database.new) and create a new project.
2. Once ready, go to **Settings > API**.
3. Copy the **Project URL** and **anon public** key.

## 2. Configure Environment Variables
Create a `.env` file in the root of your project (or add to your existing one):

```bash
PUBLIC_SUPABASE_URL=your_project_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

*Note: Since this is a static site, these keys will be exposed to the browser. This is standard for Supabase (like Firebase), but you MUST rely on Row Level Security (RLS) to protect your data.*

## 3. Create Database Table
Go to the **SQL Editor** in Supabase and run the following script to create the table for storing API keys securely (per user).

```sql
-- Create a table to store user settings (API Keys)
create table user_settings (
  user_id uuid references auth.users not null primary key,
  openrouter_key text,
  github_token text,
  github_owner text,
  github_repo text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table user_settings enable row level security;

-- Create Policy: Users can only see their own data
create policy "Users can view their own settings"
  on user_settings for select
  using ( auth.uid() = user_id );

-- Create Policy: Users can update their own data
create policy "Users can insert/update their own settings"
  on user_settings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own settings"
  on user_settings for update
  using ( auth.uid() = user_id );
```

## 4. Setup Authentication
1. Go to **Authentication > Providers**.
2. Enable **Email/Password** (or Google/GitHub if you prefer).
3. (Optional) Disable "Confirm email" in Site Settings if you want to log in immediately without verifying email during development.

## 5. Deployment
When deploying to GitHub Pages, you need to add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to your **GitHub Repository Secrets** (Settings > Secrets and variables > Actions), and ensure your build process sees them.
